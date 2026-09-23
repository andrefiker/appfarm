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

@Entity(tableName = "expenses")
data class Expense(
    @PrimaryKey val id: String,
    val name: String,
    val defaultCents: Long,
    val active: Boolean,
    val archivedFromMonth: Int?,
    val createdMonth: Int,
    val createdAt: Long,
    val updatedAt: Long
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
    val updatedAt: Long = System.currentTimeMillis()
)

@Dao
interface ExpensesDao {
    @Query("SELECT * FROM expenses ORDER BY createdAt, id") fun expenses(): Flow<List<Expense>>
    @Query("SELECT * FROM expense_months WHERE monthKey = :key") fun months(key: Int): Flow<List<ExpenseMonth>>
    @Query("SELECT * FROM expense_months") fun allMonthsFlow(): Flow<List<ExpenseMonth>>
    @Query("SELECT * FROM expenses") suspend fun allExpenses(): List<Expense>
    @Query("SELECT * FROM expense_months") suspend fun allMonths(): List<ExpenseMonth>
    @Query("SELECT * FROM expenses WHERE id = :id LIMIT 1") suspend fun expense(id: String): Expense?
    @Query("SELECT * FROM expense_months WHERE expenseId = :id AND monthKey = :key LIMIT 1")
    suspend fun month(id: String, key: Int): ExpenseMonth?
    @Upsert suspend fun put(expense: Expense)
    @Upsert suspend fun putMonth(month: ExpenseMonth)
    @Query("DELETE FROM expenses WHERE id = :id") suspend fun delete(id: String)

    @Transaction suspend fun ensureMonth(selected: YearMonth) {
        val key = selected.key()
        val saved = allMonths().filter { it.monthKey == key }.map { it.expenseId }.toSet()
        for (expense in allExpenses()) {
            if (expense.createdMonth > key || expense.id in saved) continue
            putMonth(ExpenseMonth(UUID.randomUUID().toString(), expense.id, key,
                selected.year, selected.monthValue, expense.defaultCents,
                included = expense.archivedFromMonth == null || key < expense.archivedFromMonth))
        }
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
            putMonth(ExpenseMonth(UUID.randomUUID().toString(), expense.id, key, year, month, expense.defaultCents))
        }
    }
}
