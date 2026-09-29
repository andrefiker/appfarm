package com.andrefiker.lootpayments

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow
import java.time.YearMonth
import java.util.UUID
import java.util.Locale

@Entity(tableName = "expenses")
data class Expense(
    @PrimaryKey val id: String,
    val name: String,
    val defaultCents: Long,
    val active: Boolean,
    val archivedFromMonth: Int?,
    val createdMonth: Int,
    val createdAt: Long,
    val updatedAt: Long,
    val category: String = "",
    val spendingType: String = "FLEXIBLE",
    val baselineCents: Long = defaultCents,
    val rolloverEnabled: Boolean = false,
    val tags: String = "",
    val note: String = "",
    val manualCategory: Boolean = false
)

@Entity(tableName = "expense_months",
    indices = [Index(value = ["expenseId", "monthKey"], unique = true), Index("expenseId")],
    foreignKeys = [ForeignKey(entity = Expense::class, parentColumns = ["id"],
        childColumns = ["expenseId"], onDelete = ForeignKey.CASCADE)])
data class ExpenseMonth(
    @PrimaryKey val id: String,
    val expenseId: String,
    val monthKey: Int,
    val year: Int,
    val month: Int,
    val expectedCents: Long,
    val paidCents: Long = 0,
    val included: Boolean = true,
    val forceIncomplete: Boolean = false,
    val updatedAt: Long = System.currentTimeMillis(),
    val baselineCents: Long = expectedCents,
    val spendingType: String = "FLEXIBLE"
)

@Entity(tableName = "month_closings")
data class MonthClosing(
    @PrimaryKey val monthKey: Int,
    val year: Int,
    val month: Int,
    val isClosed: Boolean,
    val closedAt: Long,
    val actualCents: Long,
    val limitCents: Long,
    val baselineCents: Long,
    val fixedCents: Long,
    val flexibleCents: Long,
    val extraordinaryCents: Long,
    val biggestName: String,
    val biggestCents: Long,
    val recurringCount: Int
)

@Entity(tableName = "category_rules", indices = [Index(value = ["pattern"], unique = true)])
data class CategoryRule(
    @PrimaryKey val id: String,
    val pattern: String,
    val category: String,
    val spendingType: String,
    val enabled: Boolean = true,
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "split_parts", indices = [Index("expenseMonthId")],
    foreignKeys = [ForeignKey(entity = ExpenseMonth::class, parentColumns = ["id"],
        childColumns = ["expenseMonthId"], onDelete = ForeignKey.CASCADE)])
data class SplitPart(
    @PrimaryKey val id: String,
    val expenseMonthId: String,
    val category: String,
    val cents: Long
)

@Entity(tableName = "actual_transactions", indices = [Index("monthKey"), Index("expenseId")])
data class ActualTransaction(
    @PrimaryKey val id: String,
    val expenseId: String?,
    val monthKey: Int,
    val occurredAt: Long,
    val amountCents: Long,
    val merchant: String,
    val category: String,
    val source: String = "MANUAL",
    val note: String = "",
    val tags: String = ""
)

@Entity(tableName = "planned_expenses", indices = [Index("monthKey")])
data class PlannedExpense(
    @PrimaryKey val id: String,
    val monthKey: Int,
    val name: String,
    val category: String,
    val amountCents: Long,
    val dueAt: Long?,
    val status: String = "PLANNED",
    val createdAt: Long = System.currentTimeMillis()
)

@Entity(tableName = "personal_rules")
data class PersonalRule(
    @PrimaryKey val id: String,
    val name: String,
    val thresholdCents: Long,
    val category: String,
    val coolingHours: Int,
    val enabled: Boolean = true,
    val timesUsed: Int = 0,
    val purchasesDeclined: Int = 0,
    val notSpentCents: Long = 0
)

@Entity(tableName = "cooling_purchases", indices = [Index("status"), Index("ruleId")])
data class CoolingPurchase(
    @PrimaryKey val id: String,
    val item: String,
    val category: String,
    val amountCents: Long,
    val createdAt: Long,
    val readyAt: Long,
    val status: String = "WAITING",
    val ruleId: String?
)

@Entity(tableName = "strategy_events", indices = [Index("ruleId")])
data class StrategyEvent(
    @PrimaryKey val id: String,
    val ruleId: String?,
    val coolingPurchaseId: String?,
    val action: String,
    val amountCents: Long,
    val occurredAt: Long = System.currentTimeMillis()
)

@Dao
interface ExpensesDao {
    @Query("SELECT * FROM expenses ORDER BY createdAt, id") fun expenses(): Flow<List<Expense>>
    @Query("SELECT * FROM expense_months WHERE monthKey = :key") fun months(key: Int): Flow<List<ExpenseMonth>>
    @Query("SELECT * FROM expense_months") fun allMonthsFlow(): Flow<List<ExpenseMonth>>
    @Query("SELECT * FROM month_closings") fun closingsFlow(): Flow<List<MonthClosing>>
    @Query("SELECT * FROM category_rules ORDER BY pattern") fun rulesFlow(): Flow<List<CategoryRule>>
    @Query("SELECT * FROM split_parts") fun splitPartsFlow(): Flow<List<SplitPart>>
    @Query("SELECT * FROM actual_transactions") fun actualTransactionsFlow(): Flow<List<ActualTransaction>>
    @Query("SELECT * FROM planned_expenses") fun plannedExpensesFlow(): Flow<List<PlannedExpense>>
    @Query("SELECT * FROM personal_rules") fun personalRulesFlow(): Flow<List<PersonalRule>>
    @Query("SELECT * FROM cooling_purchases") fun coolingPurchasesFlow(): Flow<List<CoolingPurchase>>
    @Query("SELECT * FROM strategy_events") fun strategyEventsFlow(): Flow<List<StrategyEvent>>
    @Query("SELECT * FROM expenses") suspend fun allExpenses(): List<Expense>
    @Query("SELECT * FROM expense_months") suspend fun allMonths(): List<ExpenseMonth>
    @Query("SELECT * FROM month_closings") suspend fun allClosings(): List<MonthClosing>
    @Query("SELECT * FROM category_rules") suspend fun allRules(): List<CategoryRule>
    @Query("SELECT * FROM split_parts") suspend fun allSplitParts(): List<SplitPart>
    @Query("SELECT * FROM actual_transactions") suspend fun allActualTransactions(): List<ActualTransaction>
    @Query("SELECT * FROM planned_expenses") suspend fun allPlannedExpenses(): List<PlannedExpense>
    @Query("SELECT * FROM personal_rules") suspend fun allPersonalRules(): List<PersonalRule>
    @Query("SELECT * FROM cooling_purchases") suspend fun allCoolingPurchases(): List<CoolingPurchase>
    @Query("SELECT * FROM strategy_events") suspend fun allStrategyEvents(): List<StrategyEvent>
    @Query("SELECT * FROM expenses WHERE id = :id LIMIT 1") suspend fun expense(id: String): Expense?
    @Query("SELECT * FROM expense_months WHERE expenseId = :id AND monthKey = :key LIMIT 1")
    suspend fun month(id: String, key: Int): ExpenseMonth?
    @Upsert suspend fun put(expense: Expense)
    @Upsert suspend fun putAll(expenses: List<Expense>)
    @Upsert suspend fun putMonth(month: ExpenseMonth)
    @Upsert suspend fun putMonths(months: List<ExpenseMonth>)
    @Upsert suspend fun putClosing(closing: MonthClosing)
    @Upsert suspend fun putClosings(closing: List<MonthClosing>)
    @Upsert suspend fun putRule(rule: CategoryRule)
    @Upsert suspend fun putRules(rules: List<CategoryRule>)
    @Upsert suspend fun putSplitPart(part: SplitPart)
    @Upsert suspend fun putSplitParts(parts: List<SplitPart>)
    @Upsert suspend fun putActualTransaction(item: ActualTransaction)
    @Upsert suspend fun putActualTransactions(items: List<ActualTransaction>)
    @Query("UPDATE actual_transactions SET amountCents = :cents WHERE expenseId = :expenseId AND monthKey = :monthKey")
    suspend fun updateActualTransactionAmount(expenseId: String, monthKey: Int, cents: Long)
    @Query("UPDATE actual_transactions SET category = :category, tags = :tags WHERE expenseId = :expenseId")
    suspend fun updateActualTransactionDetails(expenseId: String, category: String, tags: String)
    @Upsert suspend fun putPlannedExpense(item: PlannedExpense)
    @Upsert suspend fun putPlannedExpenses(items: List<PlannedExpense>)
    @Upsert suspend fun putPersonalRule(item: PersonalRule)
    @Upsert suspend fun putPersonalRules(items: List<PersonalRule>)
    @Upsert suspend fun putCoolingPurchase(item: CoolingPurchase)
    @Upsert suspend fun putCoolingPurchases(items: List<CoolingPurchase>)
    @Upsert suspend fun putStrategyEvent(item: StrategyEvent)
    @Upsert suspend fun putStrategyEvents(items: List<StrategyEvent>)
    @Query("DELETE FROM category_rules WHERE id = :id") suspend fun deleteRule(id: String)
    @Query("DELETE FROM split_parts WHERE expenseMonthId = :monthId") suspend fun clearSplit(monthId: String)
    @Query("DELETE FROM planned_expenses WHERE id = :id") suspend fun deletePlannedExpense(id: String)
    @Query("DELETE FROM actual_transactions WHERE id = :id") suspend fun deleteActualTransaction(id: String)
    @Query("DELETE FROM actual_transactions WHERE expenseId = :expenseId")
    suspend fun deleteActualTransactionsForExpense(expenseId: String)
    @Query("DELETE FROM personal_rules WHERE id = :id") suspend fun deletePersonalRule(id: String)
    @Query("DELETE FROM cooling_purchases WHERE id = :id") suspend fun deleteCoolingPurchase(id: String)
    @Query("DELETE FROM expenses WHERE id = :id") suspend fun delete(id: String)
    @Query("DELETE FROM expense_months") suspend fun clearMonths()
    @Query("DELETE FROM expenses") suspend fun clearExpenses()
    @Query("DELETE FROM month_closings") suspend fun clearClosings()
    @Query("DELETE FROM category_rules") suspend fun clearRules()
    @Query("DELETE FROM split_parts") suspend fun clearSplits()
    @Query("DELETE FROM actual_transactions") suspend fun clearActualTransactions()
    @Query("DELETE FROM planned_expenses") suspend fun clearPlannedExpenses()
    @Query("DELETE FROM personal_rules") suspend fun clearPersonalRules()
    @Query("DELETE FROM cooling_purchases") suspend fun clearCoolingPurchases()
    @Query("DELETE FROM strategy_events") suspend fun clearStrategyEvents()

    @Transaction suspend fun clearAll() {
        clearStrategyEvents(); clearCoolingPurchases(); clearPersonalRules(); clearPlannedExpenses()
        clearActualTransactions(); clearSplits(); clearClosings(); clearRules(); clearMonths(); clearExpenses()
    }

    /**
     * Import the supplied statement rows exactly once without replacing later user edits.
     * Each bank outflow is both an editable ledger row and an explicit actual transaction.
     */
    @Transaction suspend fun importStatementRows(rows: List<StatementSeedRow>) {
        val month = StatementSeed202609.month
        val monthKey = month.key()
        val existingIds = allExpenses().mapTo(mutableSetOf()) { it.id }
        for ((index, row) in rows.withIndex()) {
            if (row.id in existingIds) continue
            val occurredAt = StatementSeed202609.occurredAt(row)
            val expense = Expense(
                id = row.id,
                name = row.original,
                defaultCents = 0,
                active = true,
                archivedFromMonth = null,
                createdMonth = monthKey,
                createdAt = occurredAt + index,
                updatedAt = occurredAt + index,
                category = "",
                spendingType = "FLEXIBLE",
                baselineCents = 0,
                tags = "extrato",
                note = "${row.source} · ${row.date.substring(8, 10)}/09/2026 · original: ${row.original}",
                manualCategory = false
            )
            put(expense)
            putMonth(ExpenseMonth(
                id = "${row.id}-month",
                expenseId = row.id,
                monthKey = monthKey,
                year = month.year,
                month = month.monthValue,
                expectedCents = 0,
                paidCents = row.cents,
                included = true,
                baselineCents = 0,
                spendingType = "FLEXIBLE",
                updatedAt = occurredAt + index
            ))
            putActualTransaction(ActualTransaction(
                id = "${row.id}-actual",
                expenseId = row.id,
                monthKey = monthKey,
                occurredAt = occurredAt,
                amountCents = row.cents,
                merchant = row.original,
                category = "",
                source = row.source,
                note = expense.note,
                tags = expense.tags
            ))
            existingIds += row.id
        }
    }

    @Transaction suspend fun deleteExpenseAndTransactions(id: String) {
        deleteActualTransactionsForExpense(id)
        delete(id)
    }

    @Transaction suspend fun ensureMonth(selected: YearMonth) {
        val key = selected.key()
        val saved = allMonths().filter { it.monthKey == key }.map { it.expenseId }.toSet()
        for (expense in allExpenses()) {
            if (expense.createdMonth > key || expense.id in saved) continue
            putMonth(ExpenseMonth(UUID.randomUUID().toString(), expense.id, key,
                selected.year, selected.monthValue, expense.defaultCents,
                included = expense.archivedFromMonth == null || key < expense.archivedFromMonth,
                baselineCents = expense.baselineCents, spendingType = expense.spendingType))
        }
    }

    /** Add only absent baseline names; never replace existing user-entered amounts or history. */
    @Transaction suspend fun addMissingBaselineExpenses(baseline: List<Expense>, selected: YearMonth) {
        val existing = allExpenses()
        val existingNames = existing.map { it.name.trim().lowercase(Locale.ROOT) }.toSet()
        val existingIds = existing.map { it.id }.toSet()
        val missing = baseline.filter {
            it.name.trim().lowercase(Locale.ROOT) !in existingNames && it.id !in existingIds
        }
        if (missing.isNotEmpty()) putAll(missing)
        ensureMonth(selected)
    }

    @Transaction suspend fun changeDefault(id: String, selected: YearMonth, cents: Long) {
        val expense = expense(id) ?: return
        snapshotPrior(expense, selected.key())
        val now = System.currentTimeMillis()
        put(expense.copy(defaultCents = cents, updatedAt = now))
        allMonths().filter { it.expenseId == id && it.monthKey >= selected.key() }.forEach {
            putMonth(it.copy(expectedCents = cents, updatedAt = now))
        }
    }

    @Transaction suspend fun updateDetails(id: String, category: String, type: String,
        rollover: Boolean, tags: String, note: String) {
        val expense = expense(id) ?: return
        val now = System.currentTimeMillis()
        put(expense.copy(category = category.trim(), spendingType = type,
            rolloverEnabled = rollover, tags = tags.trim(), note = note.trim(),
            manualCategory = true, updatedAt = now))
        allMonths().filter { it.expenseId == id && it.monthKey >= expense.createdMonth }.forEach {
            putMonth(it.copy(spendingType = type, updatedAt = now))
        }
    }

    @Transaction suspend fun confirmBaseline(id: String, from: YearMonth, cents: Long) {
        val expense = expense(id) ?: return
        val now = System.currentTimeMillis()
        put(expense.copy(baselineCents = cents, updatedAt = now))
        allMonths().filter { it.expenseId == id && it.monthKey >= from.key() }.forEach {
            putMonth(it.copy(baselineCents = cents, updatedAt = now))
        }
    }

    @Transaction suspend fun replaceSplit(month: ExpenseMonth, parts: List<SplitPart>) {
        require(parts.isEmpty() || parts.sumOf { it.cents } == month.paidCents) {
            "A soma da divisão deve ser igual ao gasto registrado."
        }
        require(parts.all { it.cents >= 0 && it.expenseMonthId == month.id })
        clearSplit(month.id)
        if (parts.isNotEmpty()) putSplitParts(parts)
    }

    @Transaction suspend fun applyRuleToMatches(rule: CategoryRule) {
        val now = System.currentTimeMillis()
        val matches = allExpenses().filter { !it.manualCategory && it.name.contains(rule.pattern, ignoreCase = true) }
        for (expense in matches) {
            put(expense.copy(category = rule.category, spendingType = rule.spendingType, updatedAt = now))
            allMonths().filter { it.expenseId == expense.id }.forEach {
                putMonth(it.copy(spendingType = rule.spendingType, updatedAt = now))
            }
        }
    }

    @Transaction suspend fun setArchive(id: String, selected: YearMonth, archive: Boolean) {
        val expense = expense(id) ?: return
        snapshotPrior(expense, selected.key())
        val now = System.currentTimeMillis()
        put(expense.copy(active = !archive,
            archivedFromMonth = if (archive) selected.key() else null, updatedAt = now))
        allMonths().filter { it.expenseId == id && it.monthKey >= selected.key() }.forEach {
            putMonth(it.copy(included = !archive, updatedAt = now))
        }
    }

    /** Freeze earlier unvisited months before changing the current default or active state. */
    private suspend fun snapshotPrior(expense: Expense, before: Int) {
        val saved = allMonths().filter { it.expenseId == expense.id }.map { it.monthKey }.toSet()
        for (key in expense.createdMonth until before) {
            if (key in saved || (expense.archivedFromMonth != null && key >= expense.archivedFromMonth)) continue
            val year = (key - 1) / 12
            val month = (key - 1) % 12 + 1
            putMonth(ExpenseMonth(UUID.randomUUID().toString(), expense.id, key, year, month,
                expense.defaultCents, baselineCents = expense.baselineCents,
                spendingType = expense.spendingType))
        }
    }
}
