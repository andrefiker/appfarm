package com.andrefiker.lootpayments

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
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
data class ExpensesState(
    val month: YearMonth,
    val rows: List<ExpenseRow>,
    val totals: Totals,
    val tip: SavingsTip? = null,
    val history: List<ExpenseMonth> = emptyList(),
    val closing: MonthClosing? = null,
    val rules: List<CategoryRule> = emptyList(),
    val recurringIds: Set<String> = emptySet(),
    val unusual: List<UnusualSpend> = emptyList()
)

@OptIn(ExperimentalCoroutinesApi::class)
class ExpensesViewModel(application: Application) : AndroidViewModel(application) {
    private val dao = PaymentsDatabase.get(application).expenses()
    private val preferences = application.getSharedPreferences("loot_summary", Application.MODE_PRIVATE)
    private val selected = MutableStateFlow(YearMonth.now())
    init {
        val month = selected.value
        viewModelScope.launch {
            if (!preferences.getBoolean("monthly_baseline_seeded_v1", false)) {
                dao.addMissingBaselineExpenses(MonthlyExpenseBaseline.forMonth(month), month)
                check(preferences.edit().putBoolean("monthly_baseline_seeded_v1", true).commit())
            }
        }
    }
    val state = selected.flatMapLatest { month -> flow {
        dao.ensureMonth(month)
        emitAll(combine(dao.expenses(), dao.months(month.key()), dao.allMonthsFlow(),
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
            dao.put(Expense(UUID.randomUUID().toString(), name.trim(), amount, active,
                if (active) null else month.key(), month.key(), now, now,
                category = rule?.category ?: name.trim(),
                spendingType = rule?.spendingType ?: SpendingType.FLEXIBLE.stored,
                baselineCents = amount, manualCategory = false))
            dao.ensureMonth(month)
        }
    }
    fun rename(id: String, name: String) = viewModelScope.launch {
        val expense = dao.expense(id) ?: return@launch
        dao.put(expense.copy(name = name.trim(), updatedAt = System.currentTimeMillis()))
    }
    fun changeAmount(row: ExpenseRow, cents: Long) = viewModelScope.launch {
        dao.changeDefault(row.expense.id, selected.value, cents)
    }
    fun setPaid(row: ExpenseRow, paid: Long) = viewModelScope.launch {
        val existing = dao.month(row.expense.id, row.payment.monthKey) ?: return@launch
        dao.putMonth(existing.copy(paidCents = paid, forceIncomplete = false,
            updatedAt = System.currentTimeMillis()))
    }
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
        dao.updateDetails(row.expense.id, category, type.stored, rollover, tags, note)
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

    fun deleteRule(id: String) = viewModelScope.launch { dao.deleteRule(id) }

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
            Triple("Comida", 147_979L, SpendingType.FLEXIBLE),
            Triple("Weed", 40_000L, SpendingType.FIXED),
            Triple("Assinaturas/Google", 59_208L, SpendingType.FIXED),
            Triple("Compras", 51_934L, SpendingType.FLEXIBLE),
            Triple("Pods", 39_800L, SpendingType.FLEXIBLE),
            Triple("Faxina/limpeza", 40_000L, SpendingType.FIXED),
            Triple("Saúde", 39_662L, SpendingType.FLEXIBLE),
            Triple("Carro/combustível", 12_595L, SpendingType.FLEXIBLE),
            Triple("Uber/transporte", 11_780L, SpendingType.FLEXIBLE),
            Triple("Ads Mãe", 8_000L, SpendingType.FIXED),
            Triple("Taxas bancárias", 380L, SpendingType.FIXED)
        )
        return entries.mapIndexed { index, (name, cents, type) -> Expense(
            id = "baseline_${index + 1}", name = name, defaultCents = cents, active = true,
            archivedFromMonth = null, createdMonth = month.key(), createdAt = now, updatedAt = now,
            category = name, spendingType = type.stored, baselineCents = cents
        ) }
    }
}
