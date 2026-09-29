package com.andrefiker.lootpayments

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.LocalDate
import java.util.Locale

private sealed interface ExpenseEditor {
    data object Add : ExpenseEditor
    data class Name(val row: ExpenseRow) : ExpenseEditor
    data class Amount(val row: ExpenseRow) : ExpenseEditor
    data class Paid(val row: ExpenseRow) : ExpenseEditor
    data class Manage(val row: ExpenseRow) : ExpenseEditor
    data class Details(val row: ExpenseRow) : ExpenseEditor
    data class Delete(val row: ExpenseRow) : ExpenseEditor
    data class DeleteFinal(val row: ExpenseRow) : ExpenseEditor
}

@Composable
fun ExpensesScreen(state: ExpensesState, vm: ExpensesViewModel, incomeTotals: Totals? = null,
    onData: () -> Unit = {}) {
    var editor by remember { mutableStateOf<ExpenseEditor?>(null) }
    var searchOpen by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    var typeFilter by remember { mutableStateOf<SpendingType?>(null) }
    val filtered = state.rows.filter { row ->
        val text = listOf(row.expense.name, row.expense.category, row.expense.tags, row.expense.note).joinToString(" ")
        (query.isBlank() || text.contains(query, ignoreCase = true)) &&
            (typeFilter == null || SpendingType.from(row.payment.spendingType) == typeFilter)
    }
    val active = filtered.filter { it.payment.included }
    val inactive = filtered.filterNot { it.payment.included }
    val suggestedLimit = state.totals.expected
    val limit = vm.spendingLimit(state.month, suggestedLimit)
    val metrics = BudgetMath.metrics(state.month, LocalDate.now(), state.rows.map { it.toBudgetItem() }, limit,
        state.plannedExpenses.sumOf { it.amountCents })
    val income = incomeTotals?.paid ?: 0L
    val goal = vm.savingsGoal(state.month)
    Column(Modifier.fillMaxSize().statusBarsPadding().padding(horizontal = 14.dp)) {
        LootHeader("Mês", state.month, { vm.shiftMonth(-1) }, { vm.shiftMonth(1) },
            "Despesa", onData) { editor = ExpenseEditor.Add }
        MonthHomeSummary(income, metrics.actualCents, income - metrics.actualCents, goal, metrics.forecastCents)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            TextButton(onClick = { searchOpen = !searchOpen }) { Text(if (searchOpen) "Ocultar busca" else "Buscar e filtrar") }
        }
        if (searchOpen) {
            OutlinedTextField(query, { query = it }, modifier = Modifier.fillMaxWidth(), singleLine = true,
                label = { Text("Nome, categoria, tag ou nota") })
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                listOf<SpendingType?>(null, SpendingType.FIXED, SpendingType.FLEXIBLE, SpendingType.EXTRAORDINARY).forEach { option ->
                    val label = option?.label ?: "Todos"
                    Text(label, fontSize = 10.sp, color = if (typeFilter == option) Color.White else teal,
                        modifier = Modifier.clip(RoundedCornerShape(9.dp)).background(if (typeFilter == option) teal else accent)
                            .clickable { typeFilter = option }.padding(horizontal = 8.dp, vertical = 7.dp))
                }
            }
            Spacer(Modifier.height(5.dp))
        }
        Spacer(Modifier.height(7.dp))
        if (state.rows.isEmpty()) {
            EmptyLedgerState("Nenhuma despesa ainda.", "Adicione a primeira despesa para começar.",
                "Adicionar") { editor = ExpenseEditor.Add }
        } else Box(Modifier.weight(1f)) {
            LazyColumn(modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp))
                .background(Color.White), contentPadding = PaddingValues(bottom = 12.dp)) {
                if (active.isEmpty()) item {
                    Text("Nenhuma despesa ativa neste mês.", color = muted, modifier = Modifier.padding(18.dp))
                }
                items(active, key = { it.expense.id }) { row -> CompactPaymentRow(
                    name = row.expense.name, expected = row.payment.expectedCents,
                    paid = row.payment.paidCents, full = row.line.full,
                    enabled = row.payment.included && row.payment.expectedCents > 0,
                    subtitle = expensePaymentSubtitle(row), subtitleOnClick = { editor = ExpenseEditor.Paid(row) },
                    onName = { editor = ExpenseEditor.Name(row) }, onAmount = { editor = ExpenseEditor.Amount(row) },
                    onPaid = { editor = ExpenseEditor.Paid(row) }, onManage = { editor = ExpenseEditor.Manage(row) },
                    onFull = { vm.setFull(row, it) })
                    if (row != active.last()) HorizontalDivider(Modifier.padding(start = 14.dp), color = divider)
                }
                if (inactive.isNotEmpty()) {
                    item { Text("INATIVAS", color = muted, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)) }
                    items(inactive, key = { it.expense.id }) { row -> CompactPaymentRow(
                        name = row.expense.name, expected = row.payment.expectedCents,
                        paid = row.payment.paidCents, full = row.line.full, enabled = false, inactive = true,
                        subtitle = expensePaymentSubtitle(row, inactive = true), subtitleOnClick = { editor = ExpenseEditor.Paid(row) },
                        onName = { editor = ExpenseEditor.Name(row) }, onAmount = { editor = ExpenseEditor.Amount(row) },
                        onPaid = { editor = ExpenseEditor.Paid(row) }, onManage = { editor = ExpenseEditor.Manage(row) },
                        onFull = { vm.setFull(row, it) })
                        HorizontalDivider(Modifier.padding(start = 14.dp), color = divider)
                    }
                }
            }
        }
    }
    when (val action = editor) {
        ExpenseEditor.Add -> ExpenseForm(onDismiss = { editor = null }, onSave = { name, cents, active ->
            vm.add(name, cents, active); editor = null
        })
        is ExpenseEditor.Name -> TextEntry("Nome da despesa", action.row.expense.name, false, { editor = null }) {
            vm.rename(action.row.expense.id, it); editor = null
        }
        is ExpenseEditor.Amount -> TextEntry("Valor mensal", Money.format(action.row.payment.expectedCents), true, { editor = null }) {
            vm.changeAmount(action.row, Money.parse(it)!!); editor = null
        }
        is ExpenseEditor.Paid -> TextEntry("Já pago em ${state.month.format(dateFormatter)}", Money.format(action.row.payment.paidCents), true, { editor = null }) {
            vm.setPaid(action.row, Money.parse(it)!!); editor = null
        }
        is ExpenseEditor.Manage -> AlertDialog(onDismissRequest = { editor = null },
            title = { Text(action.row.expense.name) },
            text = { Column {
                Text("Arquivar remove esta despesa do previsto neste mês e nos próximos. Meses anteriores permanecem registrados.")
                Spacer(Modifier.height(8.dp))
                TextButton(onClick = { editor = ExpenseEditor.Details(action.row) }) {
                    Text("Categoria, tipo, rollover, tags e nota…")
                }
                TextButton(onClick = { vm.setArchived(action.row, action.row.payment.included); editor = null }) {
                    Text(if (action.row.payment.included) "Arquivar despesa" else "Reativar despesa")
                }
                TextButton(onClick = { editor = ExpenseEditor.Delete(action.row) }) { Text("Excluir despesa…", color = Color(0xFF9C4545)) }
            } }, confirmButton = { TextButton(onClick = { editor = null }) { Text("Fechar") } })
        is ExpenseEditor.Details -> CategoryDetailDialog(action.row, state, vm) { editor = null }
        is ExpenseEditor.Delete -> AlertDialog(onDismissRequest = { editor = null }, title = { Text("Excluir ${action.row.expense.name}?") },
            text = { Text("Isto apagará permanentemente os pagamentos e valores anteriores desta despesa. Para preservar o histórico, prefira arquivar.") },
            confirmButton = { TextButton(onClick = {
                if (action.row.hasHistory) editor = ExpenseEditor.DeleteFinal(action.row)
                else { vm.delete(action.row.expense.id); editor = null }
            }) { Text(if (action.row.hasHistory) "Continuar" else "Excluir", color = Color(0xFF9C4545)) } },
            dismissButton = { TextButton(onClick = { editor = null }) { Text("Cancelar") } })
        is ExpenseEditor.DeleteFinal -> AlertDialog(onDismissRequest = { editor = null },
            title = { Text("Última confirmação") },
            text = { Text("Há meses anteriores registrados. Excluir definitivamente apaga esse histórico também. Deseja continuar?") },
            confirmButton = { TextButton(onClick = { vm.delete(action.row.expense.id); editor = null }) { Text("Excluir definitivamente", color = Color(0xFF9C4545)) } },
            dismissButton = { TextButton(onClick = { editor = null }) { Text("Manter despesa") } })
        null -> Unit
    }
}

internal data class ExpenseRowDisplay(val principalCents: Long, val paidCents: Long, val remainingCents: Long)

internal fun expenseRowDisplay(expectedCents: Long, paidCents: Long): ExpenseRowDisplay =
    ExpenseRowDisplay(expectedCents, paidCents, (expectedCents - paidCents).coerceAtLeast(0))

private fun expensePaymentSubtitle(row: ExpenseRow, inactive: Boolean = false): String {
    val display = expenseRowDisplay(row.payment.expectedCents, row.payment.paidCents)
    val category = row.expense.category.ifBlank { row.expense.name }
    val state = if (inactive) "Inativa" else SpendingType.from(row.payment.spendingType).label
    val paid = "Pago ${ledgerMoney(display.paidCents)}"
    val remaining = if (display.paidCents > 0 && display.remainingCents > 0) " · Restam ${ledgerMoney(display.remainingCents)}" else ""
    return "$category · $state · $paid$remaining"
}

@Composable
private fun MonthHomeSummary(income: Long, spending: Long, remaining: Long, goal: Long, forecast: Long) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(accent)
        .padding(horizontal = 11.dp, vertical = 8.dp)) {
        Row(Modifier.fillMaxWidth()) {
            MonthMetric("RECEITAS", income, Modifier.weight(1f))
            MonthMetric("GASTOS", spending, Modifier.weight(1f))
            MonthMetric("RESTANTE", remaining, Modifier.weight(1f), remaining < 0)
            MonthMetric("META", goal, Modifier.weight(1f))
        }
        Text("No ritmo atual, o mês fecha em aproximadamente ${ledgerMoney(forecast)}",
            color = muted, fontSize = 10.sp, modifier = Modifier.padding(top = 5.dp))
    }
}

@Composable
private fun MonthMetric(label: String, cents: Long, modifier: Modifier, alert: Boolean = false) {
    Column(modifier.padding(end = 4.dp)) {
        Text(label, color = muted, fontSize = 8.sp, fontWeight = FontWeight.Bold, maxLines = 1)
        Text(if (cents < 0) "-${ledgerMoney(-cents)}" else ledgerMoney(cents),
            color = if (alert) Color(0xFF914B47) else navy,
            fontSize = 11.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun ExpenseForm(onDismiss: () -> Unit, onSave: (String, Long, Boolean) -> Unit) {
    var name by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var active by remember { mutableStateOf(true) }
    val cents = Money.parse(amount)
    AlertDialog(onDismissRequest = onDismiss, title = { Text("Adicionar despesa") },
        text = { Column(Modifier.imePadding(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(name, { name = it }, label = { Text("Nome da despesa") }, singleLine = true)
            OutlinedTextField(amount, { amount = it }, label = { Text("Valor mensal em reais") }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { active = !active }) {
                Checkbox(active, { active = it }); Text("Ativa")
            }
        } },
        confirmButton = { TextButton(enabled = name.trim().isNotEmpty() && cents != null,
            onClick = { onSave(name.trim(), cents!!, active) }) { Text("Adicionar") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } })
}
