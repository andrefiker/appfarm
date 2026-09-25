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
import androidx.compose.foundation.layout.padding
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
import androidx.compose.material3.FloatingActionButton
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
import java.util.Locale

private sealed interface ExpenseEditor {
    data object Add : ExpenseEditor
    data class Name(val row: ExpenseRow) : ExpenseEditor
    data class Amount(val row: ExpenseRow) : ExpenseEditor
    data class Paid(val row: ExpenseRow) : ExpenseEditor
    data class Manage(val row: ExpenseRow) : ExpenseEditor
    data class Delete(val row: ExpenseRow) : ExpenseEditor
    data class DeleteFinal(val row: ExpenseRow) : ExpenseEditor
}

@Composable
fun ExpensesScreen(state: ExpensesState, vm: ExpensesViewModel) {
    var editor by remember { mutableStateOf<ExpenseEditor?>(null) }
    val active = state.rows.filter { it.payment.included }
    val inactive = state.rows.filterNot { it.payment.included }
    Column(Modifier.fillMaxSize().padding(horizontal = 14.dp)) {
        LootHeader("Gastos", state.month, { vm.shiftMonth(-1) }, { vm.shiftMonth(1) })
        Summary(state.totals, label = "despesas", paidLabel = "Pago", showOverpayment = true)
        Spacer(Modifier.height(7.dp))
        Box(Modifier.weight(1f)) {
            LazyColumn(modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp))
                .background(Color.White), contentPadding = PaddingValues(bottom = 88.dp)) {
                if (state.rows.isEmpty()) item {
                    Column(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 24.dp)) {
                        Text("Nenhuma despesa ainda.", color = navy, fontWeight = FontWeight.Medium, fontSize = 15.sp)
                        Spacer(Modifier.height(4.dp))
                        Text("Adicione a primeira despesa para começar.", color = muted, fontSize = 12.sp)
                    }
                } else if (active.isEmpty()) item {
                    Text("Nenhuma despesa ativa neste mês.", color = muted, modifier = Modifier.padding(18.dp))
                }
                items(active, key = { it.expense.id }) { row -> CompactPaymentRow(
                    name = row.expense.name, expected = row.payment.expectedCents,
                    paid = row.payment.paidCents, full = row.line.full,
                    enabled = row.payment.included && row.payment.expectedCents > 0,
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
                        onName = { editor = ExpenseEditor.Name(row) }, onAmount = { editor = ExpenseEditor.Amount(row) },
                        onPaid = { editor = ExpenseEditor.Paid(row) }, onManage = { editor = ExpenseEditor.Manage(row) },
                        onFull = { vm.setFull(row, it) })
                        HorizontalDivider(Modifier.padding(start = 14.dp), color = divider)
                    }
                }
            }
            FloatingActionButton(onClick = { editor = ExpenseEditor.Add },
                modifier = Modifier.align(Alignment.BottomEnd).padding(end = 8.dp, bottom = 10.dp)
                    .semantics { contentDescription = "Adicionar despesa" },
                shape = RoundedCornerShape(16.dp), containerColor = teal, contentColor = Color.White) {
                Text("+", fontSize = 25.sp, modifier = Modifier.padding(horizontal = 17.dp))
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
                TextButton(onClick = { vm.setArchived(action.row, action.row.payment.included); editor = null }) {
                    Text(if (action.row.payment.included) "Arquivar despesa" else "Reativar despesa")
                }
                TextButton(onClick = { editor = ExpenseEditor.Delete(action.row) }) { Text("Excluir despesa…", color = Color(0xFF9C4545)) }
            } }, confirmButton = { TextButton(onClick = { editor = null }) { Text("Fechar") } })
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

@Composable
private fun ExpenseForm(onDismiss: () -> Unit, onSave: (String, Long, Boolean) -> Unit) {
    var name by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var active by remember { mutableStateOf(true) }
    val cents = Money.parse(amount)
    AlertDialog(onDismissRequest = onDismiss, title = { Text("Adicionar despesa") },
        text = { Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
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
