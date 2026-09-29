package com.andrefiker.lootpayments

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.YearMonth
import java.time.LocalDate
import java.util.UUID

data class ExpenseRow(val expense: Expense, val payment: ExpenseMonth, val hasHistory: Boolean) {
    val line get() = MonthLine(payment.expectedCents, payment.paidCents, payment.included, payment.forceIncomplete)
}
data class SavingsTip(val key: String, val title: String, val detail: String, val possibleSavingCents: Long? = null)
data class UndoNotice(val id: Long, val message: String)
data class ExpensesState(
    val month: YearMonth,
    val rows: List<ExpenseRow>,
    val totals: Totals,
    val tip: SavingsTip? = null,
    val history: List<ExpenseMonth> = emptyList(),
    val closing: MonthClosing? = null,
    val rules: List<CategoryRule> = emptyList(),
    val recurringIds: Set<String> = emptySet(),
    val unusual: List<UnusualSpend> = emptyList(),
    val actualTransactions: List<ActualTransaction> = emptyList(),
    val plannedExpenses: List<PlannedExpense> = emptyList(),
    val personalRules: List<PersonalRule> = emptyList(),
    val coolingPurchases: List<CoolingPurchase> = emptyList(),
    val strategyEvents: List<StrategyEvent> = emptyList()
)

@OptIn(ExperimentalCoroutinesApi::class)
class ExpensesViewModel(application: Application) : AndroidViewModel(application) {
    private val dao = PaymentsDatabase.get(application).expenses()
    private val preferences = application.getSharedPreferences("loot_summary", Application.MODE_PRIVATE)
    private val selected = MutableStateFlow(YearMonth.now())
    private val _undoNotice = MutableStateFlow<UndoNotice?>(null)
    val undoNotice: StateFlow<UndoNotice?> = _undoNotice
    private var undoAction: (suspend () -> Unit)? = null

    private fun offerUndo(message: String, action: suspend () -> Unit) {
        undoAction = action
        _undoNotice.value = UndoNotice(System.nanoTime(), message)
    }

    fun undoLastEdit() = viewModelScope.launch {
        val action = undoAction ?: return@launch
        undoAction = null
        _undoNotice.value = null
        action()
    }

    fun dismissUndo() { undoAction = null; _undoNotice.value = null }
    init {
        val month = selected.value
        viewModelScope.launch {
            if (!preferences.getBoolean("monthly_baseline_seeded_v1", false)) {
                dao.addMissingBaselineExpenses(MonthlyExpenseBaseline.forMonth(month), month)
                check(preferences.edit().putBoolean("monthly_baseline_seeded_v1", true).commit())
            }
            if (!preferences.getBoolean("fixed_monthly_categories_seeded_v1", false)) {
                dao.addOrFillFixedMonthlyCategories(FixedMonthlyCategories.forMonth(month), month)
                check(preferences.edit().putBoolean("fixed_monthly_categories_seeded_v1", true).commit())
            }
        }
    }
    val state = selected.flatMapLatest { month -> flow {
        dao.ensureMonth(month)
        val base = combine(dao.expenses(), dao.months(month.key()), dao.allMonthsFlow(),
            dao.closingsFlow(), dao.rulesFlow()) { expenses, months, history, closings, rules ->
            val byId = expenses.associateBy { it.id }
            val byExpense = history.groupBy { it.expenseId }
            val rows = months.mapNotNull { payment ->
                byId[payment.expenseId]?.let { expense -> ExpenseRow(expense, payment,
                    byExpense[expense.id].orEmpty().any { it.monthKey < month.key() || it.paidCents > 0 }) }
            }.sortedWith(compareByDescending<ExpenseRow> { it.payment.included }
                .thenBy { it.expense.name.lowercase() })
            val items = rows.map { it.toBudgetItem() }
            ExpensesState(month, rows, PaymentRules.totals(rows.map { it.line }),
                SavingsInsights.forMonth(month, expenses, history), history,
                closings.firstOrNull { it.monthKey == month.key() }, rules,
                BudgetMath.recurringExpenseIds(history, month), BudgetMath.unusual(items, history, month))
        }
        val behavior = combine(base, dao.plannedExpensesFlow(), dao.personalRulesFlow(),
            dao.coolingPurchasesFlow(), dao.strategyEventsFlow()) { current, plans, rules, cooling, events ->
            current.copy(plannedExpenses = plans.filter { it.monthKey == month.key() && it.status == "PLANNED" },
                personalRules = rules, coolingPurchases = cooling.filter { it.status == "WAITING" },
                strategyEvents = events)
        }
        emitAll(combine(behavior, dao.actualTransactionsFlow()) { current, transactions ->
            current.copy(actualTransactions = transactions.filter { it.monthKey == month.key() })
        })
    } }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000),
        ExpensesState(selected.value, emptyList(), Totals(0, 0, 0)))

    fun shiftMonth(delta: Long) { selected.value = selected.value.plusMonths(delta) }
    fun spendingLimit(month: YearMonth, suggestedCents: Long): Long =
        preferences.getLong("limit_${month.key()}", suggestedCents)
    fun setSpendingLimit(month: YearMonth, cents: Long) {
        preferences.edit().putLong("limit_${month.key()}", cents).apply()
    }
    fun savingsGoal(month: YearMonth): Long = preferences.getLong("savings_goal_${month.key()}", 0)
    fun setSavingsGoal(month: YearMonth, cents: Long) {
        preferences.edit().putLong("savings_goal_${month.key()}", cents).apply()
    }
    fun encouragementEnabled(): Boolean = preferences.getBoolean("encouragement_enabled", true)
    fun setEncouragementEnabled(enabled: Boolean) {
        preferences.edit().putBoolean("encouragement_enabled", enabled).apply()
    }
    fun dismissedTipKey(): String? = preferences.getString("dismissed_tip_key", null)
    fun dismissTip(key: String) { preferences.edit().putString("dismissed_tip_key", key).apply() }
    fun showTipAgain() { preferences.edit().remove("dismissed_tip_key").apply() }
    fun add(name: String, amount: Long, active: Boolean) {
        val month = selected.value
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            val rule = dao.allRules().firstOrNull { it.enabled &&
                name.contains(it.pattern, ignoreCase = true) }
            val id = UUID.randomUUID().toString()
            dao.put(Expense(id, name.trim(), amount, active,
                if (active) null else month.key(), month.key(), now, now,
                category = rule?.category ?: name.trim(),
                spendingType = rule?.spendingType ?: SpendingType.FLEXIBLE.stored,
                baselineCents = amount, manualCategory = false))
            dao.ensureMonth(month)
            offerUndo("Despesa adicionada: ${ledgerMoney(amount)}") { dao.delete(id) }
        }
    }

    fun addActual(name: String, amount: Long, category: String? = null) {
        val month = selected.value
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            val id = UUID.randomUUID().toString()
            dao.put(Expense(id, name, 0, true, null, month.key(), now, now,
                category = category ?: name, spendingType = SpendingType.FLEXIBLE.stored,
                baselineCents = 0, manualCategory = category != null))
            dao.ensureMonth(month)
            dao.month(id, month.key())?.let { dao.putMonth(it.copy(paidCents = amount, updatedAt = now)) }
            val transactionId = UUID.randomUUID().toString()
            dao.putActualTransaction(ActualTransaction(transactionId, id, month.key(), now, amount,
                name, category ?: name))
            offerUndo("Gasto aplicado: ${ledgerMoney(amount)}") {
                dao.deleteActualTransaction(transactionId); dao.delete(id)
            }
        }
    }
    fun rename(id: String, name: String) = viewModelScope.launch {
        val expense = dao.expense(id) ?: return@launch
        dao.put(expense.copy(name = name.trim(), updatedAt = System.currentTimeMillis()))
    }
    fun changeAmount(row: ExpenseRow, cents: Long) = viewModelScope.launch {
        val oldExpense = dao.expense(row.expense.id) ?: return@launch
        val oldMonths = dao.allMonths().filter { it.expenseId == row.expense.id }
        dao.changeDefault(row.expense.id, selected.value, cents)
        offerUndo("Valor mensal alterado") { dao.put(oldExpense); dao.putMonths(oldMonths) }
    }
    fun setPaid(row: ExpenseRow, paid: Long) = viewModelScope.launch {
        val existing = dao.month(row.expense.id, row.payment.monthKey) ?: return@launch
        dao.putMonth(existing.copy(paidCents = paid, forceIncomplete = false,
            updatedAt = System.currentTimeMillis()))
        offerUndo("Gasto atualizado: ${ledgerMoney(paid)}") { dao.putMonth(existing) }
    }
    fun addToPaid(row: ExpenseRow, amount: Long) = setPaid(row, row.payment.paidCents + amount)
    fun setFull(row: ExpenseRow, full: Boolean) = viewModelScope.launch {
        val existing = dao.month(row.expense.id, row.payment.monthKey) ?: return@launch
        dao.putMonth(existing.copy(paidCents = if (full) existing.expectedCents else existing.paidCents,
            forceIncomplete = !full, updatedAt = System.currentTimeMillis()))
    }
    fun setArchived(row: ExpenseRow, archive: Boolean) = viewModelScope.launch {
        dao.setArchive(row.expense.id, selected.value, archive)
    }
    fun delete(id: String) = viewModelScope.launch { dao.delete(id) }

    fun updateDetails(row: ExpenseRow, category: String, type: SpendingType,
        rollover: Boolean, tags: String, note: String) = viewModelScope.launch {
        val oldExpense = dao.expense(row.expense.id) ?: return@launch
        val oldMonths = dao.allMonths().filter { it.expenseId == row.expense.id }
        dao.updateDetails(row.expense.id, category, type.stored, rollover, tags, note)
        offerUndo("Classificação atualizada") { dao.put(oldExpense); dao.putMonths(oldMonths) }
    }

    fun confirmBaseline(row: ExpenseRow, cents: Long = row.payment.paidCents) = viewModelScope.launch {
        dao.confirmBaseline(row.expense.id, selected.value, cents)
    }

    fun saveRule(pattern: String, category: String, type: SpendingType) = viewModelScope.launch {
        val clean = pattern.trim()
        if (clean.isEmpty()) return@launch
        val rule = CategoryRule(UUID.randomUUID().toString(), clean, category.trim(), type.stored)
        dao.putRule(rule)
        dao.applyRuleToMatches(rule)
    }

    fun applyRule(rule: CategoryRule) = viewModelScope.launch { dao.applyRuleToMatches(rule) }

    fun deleteCategoryRule(id: String) = viewModelScope.launch { dao.deleteRule(id) }

    fun saveMerchantRule(rule: CategoryRule) = viewModelScope.launch {
        if (rule.pattern.trim().length < 3 || rule.category.isBlank()) return@launch
        dao.putRule(rule.copy(pattern = rule.pattern.trim(), category = rule.category.trim(),
            canonicalName = rule.canonicalName.trim()))
    }

    fun addPlan(name: String, category: String, cents: Long) = viewModelScope.launch {
        dao.putPlannedExpense(PlannedExpense(UUID.randomUUID().toString(), selected.value.key(),
            name.trim(), category.trim(), cents, null))
    }

    fun deletePlan(id: String) = viewModelScope.launch { dao.deletePlannedExpense(id) }

    fun addPersonalRule(name: String, thresholdCents: Long, category: String, coolingHours: Int) = viewModelScope.launch {
        dao.putPersonalRule(PersonalRule(UUID.randomUUID().toString(), name.trim(), thresholdCents,
            category.trim(), coolingHours.coerceAtLeast(1)))
    }

    fun deletePersonalRule(id: String) = viewModelScope.launch { dao.deletePersonalRule(id) }

    fun addCooling(item: String, category: String, cents: Long, rule: PersonalRule?) = viewModelScope.launch {
        val now = System.currentTimeMillis()
        val hours = rule?.coolingHours ?: 48
        val purchase = CoolingPurchase(UUID.randomUUID().toString(), item.ifBlank { "Compra planejada" },
            category, cents, now, now + hours * 3_600_000L, ruleId = rule?.id)
        dao.putCoolingPurchase(purchase)
        rule?.let { dao.putPersonalRule(it.copy(timesUsed = it.timesUsed + 1)) }
        dao.putStrategyEvent(StrategyEvent(UUID.randomUUID().toString(), rule?.id, purchase.id,
            "WAITED", cents))
    }

    fun postponeCooling(item: CoolingPurchase, hours: Int = 24) = viewModelScope.launch {
        dao.putCoolingPurchase(item.copy(readyAt = item.readyAt + hours * 3_600_000L))
        dao.putStrategyEvent(StrategyEvent(UUID.randomUUID().toString(), item.ruleId, item.id,
            "POSTPONED", item.amountCents))
    }

    fun discardCooling(item: CoolingPurchase) = viewModelScope.launch {
        dao.putCoolingPurchase(item.copy(status = "DISCARDED"))
        item.ruleId?.let { id -> dao.allPersonalRules().firstOrNull { it.id == id }?.let { rule ->
            dao.putPersonalRule(rule.copy(purchasesDeclined = rule.purchasesDeclined + 1,
                notSpentCents = rule.notSpentCents + item.amountCents))
        } }
        dao.putStrategyEvent(StrategyEvent(UUID.randomUUID().toString(), item.ruleId, item.id,
            "DISCARDED", item.amountCents))
    }

    fun buyCooling(item: CoolingPurchase) = viewModelScope.launch {
        dao.putCoolingPurchase(item.copy(status = "BOUGHT"))
        recordActual(item.item, item.category, item.amountCents)
        dao.putStrategyEvent(StrategyEvent(UUID.randomUUID().toString(), item.ruleId, item.id,
            "BOUGHT", item.amountCents))
    }

    private suspend fun recordActual(name: String, category: String, amount: Long) {
        val month = selected.value
        val now = System.currentTimeMillis()
        val id = UUID.randomUUID().toString()
        dao.put(Expense(id, name, 0, true, null, month.key(), now, now, category = category,
            spendingType = SpendingType.FLEXIBLE.stored, baselineCents = 0, manualCategory = true))
        dao.ensureMonth(month)
        dao.month(id, month.key())?.let { dao.putMonth(it.copy(paidCents = amount, updatedAt = now)) }
        dao.putActualTransaction(ActualTransaction(UUID.randomUUID().toString(), id, month.key(), now,
            amount, name, category))
    }

    fun replaceSplit(row: ExpenseRow, parts: List<Pair<String, Long>>) = viewModelScope.launch {
        dao.replaceSplit(row.payment, parts.map { (category, cents) ->
            SplitPart(UUID.randomUUID().toString(), row.payment.id, category.trim(), cents)
        })
    }

    fun closeMonth(limitCents: Long) = viewModelScope.launch {
        val current = state.value
        val metrics = BudgetMath.metrics(current.month, LocalDate.now(), current.rows.map { it.toBudgetItem() }, limitCents)
        val biggest = current.rows.filter { it.payment.included }.maxByOrNull { it.payment.paidCents }
        dao.putClosing(MonthClosing(current.month.key(), current.month.year, current.month.monthValue,
            true, System.currentTimeMillis(), metrics.actualCents, limitCents, metrics.baselineCents,
            metrics.fixedCents, metrics.flexibleCents, metrics.extraordinaryCents,
            biggest?.expense?.name.orEmpty(), biggest?.payment?.paidCents ?: 0,
            current.recurringIds.size))
    }

    fun reopenMonth() = viewModelScope.launch {
        state.value.closing?.let { dao.putClosing(it.copy(isClosed = false)) }
    }

}

internal object SavingsInsights {
    fun forMonth(month: YearMonth, expenses: List<Expense>, history: List<ExpenseMonth>): SavingsTip? {
        val names = expenses.associate { it.id to it.name }
        val monthKey = month.key()
        // Compare the two latest recorded months for the same expense; avoid implying a trend
        // from a single month or from the still-in-progress selected month.
        val increase = history.asSequence()
            .filter { it.monthKey < monthKey && it.paidCents > 0 }
            .groupBy { it.expenseId }
            .mapNotNull { (id, records) ->
                val lastTwo = records.sortedByDescending { it.monthKey }.take(2)
                if (lastTwo.size < 2) return@mapNotNull null
                val latest = lastTwo[0]
                val prior = lastTwo[1]
                val delta = latest.paidCents - prior.paidCents
                if (delta <= 0 || delta < prior.paidCents / 5) return@mapNotNull null
                Triple(id, prior, latest)
            }
            .maxByOrNull { (_, prior, latest) -> latest.paidCents - prior.paidCents }
        if (increase != null) {
            val (id, prior, latest) = increase
            val label = names[id] ?: "Uma despesa"
            val saving = latest.paidCents - prior.paidCents
            val key = "increase:$id:${latest.monthKey}:${latest.paidCents}"
            return SavingsTip(key, "Uma despesa aumentou no histórico",
                "$label passou de ${ledgerMoney(prior.paidCents)} para ${ledgerMoney(latest.paidCents)} nos últimos meses registrados. Confira se houve mudança ou se dá para voltar ao valor anterior.", saving)
        }

        val largest = history.filter { it.monthKey == monthKey && it.included }
            .maxByOrNull { it.expectedCents }
        if (largest != null && largest.expectedCents > 0) {
            val name = names[largest.expenseId] ?: "Esta despesa"
            return SavingsTip("review:${largest.expenseId}:$monthKey", "Comece pela maior despesa prevista",
                "$name é sua maior despesa prevista neste mês (${ledgerMoney(largest.expectedCents)}). Se houver margem para reduzir 10%, isso liberaria cerca de ${ledgerMoney(largest.expectedCents / 10)}.",
                largest.expectedCents / 10)
        }
        return null
    }
}

internal object MonthlyExpenseBaseline {
    fun forMonth(month: YearMonth, now: Long = System.currentTimeMillis()): List<Expense> {
        val entries = listOf(
            Triple("Comida", 0L, SpendingType.FLEXIBLE),
            Triple("Weed", 0L, SpendingType.FLEXIBLE),
            Triple("Assinaturas/Google", 0L, SpendingType.FLEXIBLE),
            Triple("Compras", 0L, SpendingType.FLEXIBLE),
            Triple("Pods", 0L, SpendingType.FLEXIBLE),
            Triple("Faxina/limpeza", 0L, SpendingType.FLEXIBLE),
            Triple("Saúde", 0L, SpendingType.FLEXIBLE),
            Triple("Carro/combustível", 0L, SpendingType.FLEXIBLE),
            Triple("Uber/transporte", 0L, SpendingType.FLEXIBLE),
            Triple("Ads Mãe", 0L, SpendingType.FLEXIBLE),
            Triple("Taxas bancárias", 0L, SpendingType.FLEXIBLE)
        )
        return entries.mapIndexed { index, (name, cents, type) -> Expense(
            id = "baseline_${index + 1}", name = name, defaultCents = cents, active = true,
            archivedFromMonth = null, createdMonth = month.key(), createdAt = now, updatedAt = now,
            category = name, spendingType = type.stored, baselineCents = cents
        ) }
    }
}

internal object FixedMonthlyCategories {
    fun forMonth(month: YearMonth, now: Long = System.currentTimeMillis()): List<Expense> {
        val entries = listOf(
            "alimentação" to 300_000L,
            "aluguel" to 180_000L,
            "cartão xp" to 100_000L,
            "celular" to 28_000L,
            "compras" to 100_000L,
            "Conceição" to 80_000L,
            "equalize" to 63_000L,
            "medicação" to 80_000L,
            "Notredame" to 75_000L,
            "poupança" to 150_000L,
            "psiquiatra" to 100_000L,
            "transporte" to 50_000L,
            "weed" to 50_000L,
            "wifi" to 24_000L
        )
        return entries.mapIndexed { index, (name, cents) -> Expense(
            id = "fixed_monthly_${index + 1}", name = name, defaultCents = cents, active = true,
            archivedFromMonth = null, createdMonth = month.key(), createdAt = now, updatedAt = now,
            category = name, spendingType = SpendingType.FIXED.stored, baselineCents = cents,
            manualCategory = true
        ) }
    }
}
