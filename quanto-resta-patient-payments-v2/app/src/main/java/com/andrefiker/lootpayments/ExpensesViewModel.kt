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
import java.util.UUID

data class ExpenseRow(val expense: Expense, val payment: ExpenseMonth, val hasHistory: Boolean) {
    val line get() = MonthLine(payment.expectedCents, payment.paidCents, payment.included, payment.forceIncomplete)
}
data class ExpensesState(val month: YearMonth, val rows: List<ExpenseRow>, val totals: Totals)

@OptIn(ExperimentalCoroutinesApi::class)
class ExpensesViewModel(application: Application) : AndroidViewModel(application) {
    private val dao = PaymentsDatabase.get(application).expenses()
    private val selected = MutableStateFlow(YearMonth.now())
    val state = selected.flatMapLatest { month -> flow {
        dao.ensureMonth(month)
        emitAll(combine(dao.expenses(), dao.months(month.key()), dao.allMonthsFlow()) { expenses, months, history ->
            val byId = expenses.associateBy { it.id }
            val byExpense = history.groupBy { it.expenseId }
            val rows = months.mapNotNull { payment ->
                byId[payment.expenseId]?.let { expense -> ExpenseRow(expense, payment,
                    byExpense[expense.id].orEmpty().any { it.monthKey < month.key() || it.paidCents > 0 }) }
            }.sortedWith(compareByDescending<ExpenseRow> { it.payment.included }
                .thenBy { it.expense.name.lowercase() })
            ExpensesState(month, rows, PaymentRules.totals(rows.map { it.line }))
        })
    } }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000),
        ExpensesState(selected.value, emptyList(), Totals(0, 0, 0)))

    fun shiftMonth(delta: Long) { selected.value = selected.value.plusMonths(delta) }
    fun add(name: String, amount: Long, active: Boolean) {
        val month = selected.value
        viewModelScope.launch {
            val now = System.currentTimeMillis()
            dao.put(Expense(UUID.randomUUID().toString(), name.trim(), amount, active,
                if (active) null else month.key(), month.key(), now, now))
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
}
