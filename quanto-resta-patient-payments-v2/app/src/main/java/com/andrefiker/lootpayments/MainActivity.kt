package com.andrefiker.lootpayments

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
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
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale

internal val navy = Color(0xFF233943)
internal val teal = Color(0xFF397E79)
internal val muted = Color(0xFF687A7D)
internal val paper = Color(0xFFF8F9F5)
internal val accent = Color(0xFFE9F2EE)
internal val dateFormatter = DateTimeFormatter.ofPattern("MMMM yyyy", Locale("pt", "BR"))

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = lightColorScheme(primary = teal, onPrimary = Color.White,
                background = paper, surface = Color.White, onSurface = navy)) {
                val vm: PatientPaymentsViewModel = viewModel()
                val state by vm.state.collectAsStateWithLifecycle()
                val ready by vm.ready.collectAsStateWithLifecycle()
                val expenses: ExpensesViewModel = viewModel()
                var destination by rememberSaveable { mutableStateOf(0) }
                Column(Modifier.fillMaxSize().background(paper)) {
                    androidx.compose.foundation.layout.Box(Modifier.weight(1f)) {
                        if (destination == 0) {
                            if (ready) PatientPaymentsScreen(state, vm)
                            else Text("Carregando Loot…", modifier = Modifier.padding(28.dp), color = muted)
                        } else {
                            val expenseState by expenses.state.collectAsStateWithLifecycle()
                            ExpensesScreen(expenseState, expenses)
                        }
                    }
                    Row(Modifier.fillMaxWidth().background(Color.White).padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        listOf("Pacientes", "Despesas").forEachIndexed { index, label ->
                            Button(onClick = { destination = index }, modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = if (destination == index) teal else accent,
                                    contentColor = if (destination == index) Color.White else navy)) {
                                Text(label)
                            }
                        }
                    }
                }
            }
        }
    }
}

private sealed interface Editor {
    data object Add : Editor
    data class Name(val row: PatientRow) : Editor
    data class Amount(val row: PatientRow) : Editor
    data class Paid(val row: PatientRow) : Editor
    data class Manage(val row: PatientRow) : Editor
    data class Delete(val row: PatientRow) : Editor
    data class DeleteFinal(val row: PatientRow) : Editor
}

@Composable
fun PatientPaymentsScreen(state: ScreenState, vm: PatientPaymentsViewModel) {
    var editor by remember { mutableStateOf<Editor?>(null) }
    val active = state.rows.filter { it.terms.active }
    val inactive = state.rows.filterNot { it.terms.active }
    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        Spacer(Modifier.height(12.dp))
        Text("LOOT / RECEITAS", color = teal, fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 1.4.sp)
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = { vm.shiftMonth(-1) }, modifier = Modifier.width(44.dp)) { Text("‹", fontSize = 27.sp) }
            Text(state.month.format(dateFormatter).replaceFirstChar { it.titlecase(Locale("pt", "BR")) },
                modifier = Modifier.weight(1f), color = navy, fontSize = 21.sp, fontWeight = FontWeight.SemiBold)
            TextButton(onClick = { vm.shiftMonth(1) }, modifier = Modifier.width(44.dp)) { Text("›", fontSize = 27.sp) }
        }
        Summary(state.totals)
        Spacer(Modifier.height(9.dp))
        Box(Modifier.weight(1f)) {
            LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 66.dp),
                verticalArrangement = Arrangement.spacedBy(5.dp)) {
                if (active.isEmpty()) item {
                    Text("Nenhum paciente ativo neste mês.", color = muted, modifier = Modifier.padding(vertical = 20.dp))
                }
                items(active, key = { it.patient.id }) { row -> CompactPaymentRow(
                    name = row.patient.name, expected = row.payment.expectedCents,
                    paid = row.payment.paidCents, full = row.line.full,
                    enabled = row.terms.active && row.terms.expectedCents > 0,
                    onName = { editor = Editor.Name(row) }, onAmount = { editor = Editor.Amount(row) },
                    onPaid = { editor = Editor.Paid(row) }, onManage = { editor = Editor.Manage(row) },
                    onFull = { vm.setFull(row, it) })
                }
                if (inactive.isNotEmpty()) {
                    item { Text("INATIVOS", color = muted, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = 10.dp, bottom = 3.dp)) }
                    items(inactive, key = { it.patient.id }) { row -> CompactPaymentRow(
                        name = row.patient.name, expected = row.payment.expectedCents,
                        paid = row.payment.paidCents, full = row.line.full, enabled = false,
                        onName = { editor = Editor.Name(row) }, onAmount = { editor = Editor.Amount(row) },
                        onPaid = { editor = Editor.Paid(row) }, onManage = { editor = Editor.Manage(row) },
                        onFull = { vm.setFull(row, it) })
                    }
                }
            }
            FloatingActionButton(onClick = { editor = Editor.Add },
                modifier = Modifier.align(Alignment.BottomEnd).padding(bottom = 10.dp)
                    .semantics { contentDescription = "Adicionar paciente" },
                shape = RoundedCornerShape(15.dp), containerColor = teal, contentColor = Color.White) {
                Text("+", fontSize = 26.sp)
            }
        }
    }
    when (val action = editor) {
        Editor.Add -> PatientForm(onDismiss = { editor = null }, onSave = { name, cents, active ->
            vm.add(name, cents, active); editor = null
        })
        is Editor.Name -> TextEntry("Nome ou apelido", action.row.patient.name, false, { editor = null }) {
            vm.rename(action.row.patient.id, it); editor = null
        }
        is Editor.Amount -> TextEntry("Valor mensal", Money.format(action.row.terms.expectedCents), true, { editor = null }) {
            vm.changeAmount(action.row, Money.parse(it)!!); editor = null
        }
        is Editor.Paid -> TextEntry("Já pago em ${state.month.format(dateFormatter)}", Money.format(action.row.payment.paidCents), true, { editor = null }) {
            vm.setPaid(action.row, Money.parse(it)!!); editor = null
        }
        is Editor.Manage -> AlertDialog(onDismissRequest = { editor = null },
            title = { Text(action.row.patient.name) },
            text = { Column {
                Text("Arquivar remove este paciente do previsto neste mês e nos próximos. Meses anteriores permanecem registrados.")
                Spacer(Modifier.height(8.dp))
                TextButton(onClick = { vm.setArchived(action.row, action.row.terms.active); editor = null }) {
                    Text(if (action.row.terms.active) "Arquivar paciente" else "Reativar paciente")
                }
                TextButton(onClick = { editor = Editor.Delete(action.row) }) { Text("Excluir paciente…", color = Color(0xFF9C4545)) }
            } }, confirmButton = { TextButton(onClick = { editor = null }) { Text("Fechar") } })
        is Editor.Delete -> AlertDialog(onDismissRequest = { editor = null }, title = { Text("Excluir ${action.row.patient.name}?") },
            text = { Text("Isto apagará permanentemente os pagamentos e valores anteriores deste paciente. Para preservar o histórico, prefira arquivar.") },
            confirmButton = { TextButton(onClick = {
                if (action.row.hasHistory) editor = Editor.DeleteFinal(action.row)
                else { vm.delete(action.row.patient.id); editor = null }
            }) { Text(if (action.row.hasHistory) "Continuar" else "Excluir", color = Color(0xFF9C4545)) } },
            dismissButton = { TextButton(onClick = { editor = null }) { Text("Cancelar") } })
        is Editor.DeleteFinal -> AlertDialog(onDismissRequest = { editor = null },
            title = { Text("Última confirmação") },
            text = { Text("Há meses anteriores registrados. Excluir definitivamente apaga esse histórico também. Deseja continuar?") },
            confirmButton = { TextButton(onClick = { vm.delete(action.row.patient.id); editor = null }) { Text("Excluir definitivamente", color = Color(0xFF9C4545)) } },
            dismissButton = { TextButton(onClick = { editor = null }) { Text("Manter paciente") } })
        null -> Unit
    }
}

@Composable
internal fun Summary(totals: Totals, label: String = "pacientes", paidLabel: String = "Recebido", showOverpayment: Boolean = false) {
    val over = showOverpayment && totals.paid > totals.expected
    Card(colors = CardDefaults.cardColors(containerColor = accent), shape = RoundedCornerShape(15.dp)) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 13.dp, vertical = 9.dp)) {
            Text("${totals.count} $label  ·  ${Money.format(totals.expected)} previstos", color = navy, fontSize = 13.sp)
            Spacer(Modifier.height(3.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("$paidLabel ${Money.format(totals.paid)}", color = teal, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                Text(if (over) "A mais ${Money.format(totals.paid - totals.expected)}"
                    else "Resta ${Money.format(totals.remaining)}", color = navy, fontSize = 13.sp)
            }
        }
    }
}

/** Shared compact row: full payments hide the redundant paid amount but remain editable. */
@Composable
internal fun CompactPaymentRow(name: String, expected: Long, paid: Long, full: Boolean, enabled: Boolean,
    onName: () -> Unit, onAmount: () -> Unit, onPaid: () -> Unit, onManage: () -> Unit,
    onFull: (Boolean) -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, Color(0xFFE6EBE8))) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp)) {
            Row(Modifier.fillMaxWidth().heightIn(min = 28.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(name, color = navy, fontWeight = FontWeight.SemiBold, fontSize = 15.sp,
                    maxLines = 1, overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f).clickable(onClick = onName))
                Text("${Money.format(expected)} / mês", color = muted, fontSize = 13.sp,
                    modifier = Modifier.clickable(onClick = onAmount))
            }
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f).heightIn(min = 44.dp).clickable(onClick = onPaid),
                    contentAlignment = Alignment.CenterStart) {
                    Text(if (full) "Editar pago" else "Pago ${Money.format(paid)}", color = if (full) muted else teal,
                        fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Text(if (full) "Quitado" else "Pendente", color = muted, fontSize = 12.sp)
                Spacer(Modifier.width(4.dp))
                Switch(checked = full, enabled = enabled, onCheckedChange = onFull)
                TextButton(onClick = onManage, modifier = Modifier.width(38.dp)) {
                    Text("⋮", color = muted, fontSize = 22.sp)
                }
            }
        }
    }
}

@Composable
internal fun TextEntry(title: String, initial: String, money: Boolean, onDismiss: () -> Unit, onSave: (String) -> Unit) {
    var value by remember(title, initial) { mutableStateOf(initial) }
    val cents = if (money) Money.parse(value) else null
    val valid = if (money) cents != null else value.trim().isNotEmpty()
    AlertDialog(onDismissRequest = onDismiss, title = { Text(title) },
        text = { Column {
            OutlinedTextField(value = value, onValueChange = { value = it }, singleLine = true,
                label = { Text(if (money) "Valor em reais" else "Nome ou apelido") },
                keyboardOptions = KeyboardOptions(keyboardType = if (money) KeyboardType.Decimal else KeyboardType.Text))
            if (money && value.isNotBlank() && !valid) Text("Use 900 ou 900,50", color = Color(0xFF9C4545), fontSize = 12.sp)
        } },
        confirmButton = { TextButton(enabled = valid, onClick = { onSave(value) }) { Text("Salvar") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } })
}

@Composable
private fun PatientForm(onDismiss: () -> Unit, onSave: (String, Long, Boolean) -> Unit) {
    var name by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var active by remember { mutableStateOf(true) }
    val cents = Money.parse(amount)
    AlertDialog(onDismissRequest = onDismiss, title = { Text("Adicionar paciente") },
        text = { Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(name, { name = it }, label = { Text("Nome ou apelido") }, singleLine = true)
            OutlinedTextField(amount, { amount = it }, label = { Text("Valor mensal em reais") }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.clickable { active = !active }) {
                Checkbox(active, { active = it }); Text("Ativo")
            }
        } },
        confirmButton = { TextButton(enabled = name.trim().isNotEmpty() && cents != null, onClick = { onSave(name.trim(), cents!!, active) }) { Text("Adicionar") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } })
}
