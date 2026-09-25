package com.andrefiker.lootpayments

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
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
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.selection.TextSelectionColors
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale

internal val navy = Color(0xFF26383B)
internal val teal = Color(0xFF3A7972)
internal val muted = Color(0xFF607276)
internal val paper = Color(0xFFF8F7F3)
internal val accent = Color(0xFFE9F1ED)
internal val divider = Color(0xFFE8EBE7)
internal val dateFormatter = DateTimeFormatter.ofPattern("MMMM yyyy", Locale("pt", "BR"))
internal fun ledgerMoney(cents: Long): String = Money.format(cents).replace(Regex(",00$"), "")

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
                    HorizontalDivider(color = divider)
                    Row(Modifier.fillMaxWidth().background(paper).padding(horizontal = 14.dp, vertical = 5.dp)) {
                        listOf("Receitas", "Gastos").forEachIndexed { index, label ->
                            Box(Modifier.weight(1f).height(44.dp).padding(horizontal = 4.dp)
                                .clip(RoundedCornerShape(11.dp))
                                .background(if (destination == index) accent else Color.Transparent)
                                .clickable(role = Role.Tab) { destination = index }
                                .semantics { selected = destination == index },
                                contentAlignment = Alignment.Center) {
                                Text(label, color = if (destination == index) teal else muted,
                                    fontSize = 13.sp, fontWeight = if (destination == index) FontWeight.SemiBold else FontWeight.Medium)
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
    Column(Modifier.fillMaxSize().padding(horizontal = 14.dp)) {
        LootHeader("Receitas", state.month, { vm.shiftMonth(-1) }, { vm.shiftMonth(1) })
        Summary(state.totals)
        Spacer(Modifier.height(7.dp))
        Box(Modifier.weight(1f)) {
            LazyColumn(modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp))
                .background(Color.White), contentPadding = PaddingValues(bottom = 88.dp)) {
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
                    if (row != active.last()) HorizontalDivider(Modifier.padding(start = 14.dp), color = divider)
                }
                if (inactive.isNotEmpty()) {
                    item { Text("INATIVOS", color = muted, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)) }
                    items(inactive, key = { it.patient.id }) { row -> CompactPaymentRow(
                        name = row.patient.name, expected = row.payment.expectedCents,
                        paid = row.payment.paidCents, full = row.line.full, enabled = false, inactive = true,
                        onName = { editor = Editor.Name(row) }, onAmount = { editor = Editor.Amount(row) },
                        onPaid = { editor = Editor.Paid(row) }, onManage = { editor = Editor.Manage(row) },
                        onFull = { vm.setFull(row, it) })
                        HorizontalDivider(Modifier.padding(start = 14.dp), color = divider)
                    }
                }
            }
            FloatingActionButton(onClick = { editor = Editor.Add },
                modifier = Modifier.align(Alignment.BottomEnd).padding(end = 8.dp, bottom = 10.dp)
                    .semantics { contentDescription = "Adicionar paciente" },
                shape = RoundedCornerShape(16.dp), containerColor = teal, contentColor = Color.White) {
                Text("+", fontSize = 25.sp, modifier = Modifier.padding(horizontal = 17.dp))
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
internal fun LootHeader(section: String, month: YearMonth, previous: () -> Unit, next: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(top = 7.dp, bottom = 1.dp), verticalAlignment = Alignment.CenterVertically) {
        Text("LOOT", color = teal, fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 2.sp)
        Spacer(Modifier.width(9.dp))
        Box(Modifier.size(width = 1.dp, height = 12.dp).background(divider))
        Spacer(Modifier.width(9.dp))
        Text(section.uppercase(Locale("pt", "BR")), color = muted, fontWeight = FontWeight.Medium,
            fontSize = 10.sp, letterSpacing = 1.4.sp)
    }
    Row(Modifier.fillMaxWidth().height(46.dp), horizontalArrangement = Arrangement.Center,
        verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(44.dp).clip(RoundedCornerShape(11.dp)).clickable(onClick = previous)
            .semantics { contentDescription = "Mês anterior" }, contentAlignment = Alignment.Center) {
            Text("‹", color = teal, fontSize = 27.sp)
        }
        Text(month.format(dateFormatter).replaceFirstChar { it.titlecase(Locale("pt", "BR")) },
            modifier = Modifier.widthIn(min = 180.dp, max = 230.dp), textAlign = TextAlign.Center,
            color = navy, fontSize = 20.sp, fontWeight = FontWeight.SemiBold,
            maxLines = 1, overflow = TextOverflow.Ellipsis)
        Box(Modifier.size(44.dp).clip(RoundedCornerShape(11.dp)).clickable(onClick = next)
            .semantics { contentDescription = "Próximo mês" }, contentAlignment = Alignment.Center) {
            Text("›", color = teal, fontSize = 27.sp)
        }
    }
}

@Composable
internal fun Summary(totals: Totals, label: String = "pacientes", paidLabel: String = "Recebido", showOverpayment: Boolean = false) {
    val over = showOverpayment && totals.paid > totals.expected
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(accent)
        .padding(horizontal = 12.dp, vertical = 8.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("${totals.count} $label", color = muted, fontSize = 12.sp)
                Text("Previsto ${ledgerMoney(totals.expected)}", color = navy, fontSize = 12.sp,
                    fontWeight = FontWeight.Medium, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Spacer(Modifier.height(2.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("$paidLabel ${ledgerMoney(totals.paid)}", color = teal, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                Text(if (over) "A mais ${ledgerMoney(totals.paid - totals.expected)}"
                    else "Resta ${ledgerMoney(totals.remaining)}", color = navy, fontSize = 12.sp)
            }
    }
}

/** Shared compact row: full payments hide the redundant paid amount but remain editable. */
@Composable
internal fun CompactPaymentRow(name: String, expected: Long, paid: Long, full: Boolean, enabled: Boolean,
    inactive: Boolean = false,
    onName: () -> Unit, onAmount: () -> Unit, onPaid: () -> Unit, onManage: () -> Unit,
    onFull: (Boolean) -> Unit) {
    Column(Modifier.fillMaxWidth().background(Color.White)
        .padding(start = 14.dp, end = 8.dp, top = 3.dp, bottom = 3.dp)) {
        Row(Modifier.fillMaxWidth().height(30.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f).height(30.dp).clickable(onClick = onName), contentAlignment = Alignment.CenterStart) {
                Text(name, color = navy, fontWeight = FontWeight.SemiBold, fontSize = 15.sp,
                    maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Spacer(Modifier.width(8.dp))
            Box(Modifier.widthIn(max = 145.dp).height(30.dp).clickable(onClick = onAmount),
                contentAlignment = Alignment.CenterEnd) {
                Text("${ledgerMoney(expected)} / mês", color = muted, fontSize = 12.sp,
                    style = TextStyle(fontFeatureSettings = "tnum"), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
        }
        Row(Modifier.fillMaxWidth().height(38.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f).height(38.dp).clickable(onClick = onPaid)
                .semantics { contentDescription = "Editar valor pago" }, contentAlignment = Alignment.CenterStart) {
                Text(if (full) "Editar pago" else "Pago ${ledgerMoney(paid)}",
                    color = if (full) muted else teal, fontSize = 12.sp,
                    maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            val status = if (inactive) "Inativo" else if (!enabled) "Sem valor" else if (full) "✓ Quitado" else "○ Pendente"
            Box(Modifier.height(34.dp).widthIn(min = 88.dp)
                .clip(RoundedCornerShape(9.dp))
                .background(if (full && enabled) accent else Color(0xFFF4F4F2))
                .clickable(enabled = enabled, role = Role.Checkbox) { onFull(!full) }
                .semantics { contentDescription = if (full) "Quitado; toque para desmarcar" else "Pendente; toque para quitar" }
                .padding(horizontal = 8.dp), contentAlignment = Alignment.Center) {
                Text(status, color = if (full && enabled) teal else muted,
                    fontSize = 11.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
            }
            Box(Modifier.size(width = 36.dp, height = 38.dp).clickable(onClick = onManage)
                .semantics { contentDescription = "Mais opções" }, contentAlignment = Alignment.Center) {
                Text("⋮", color = muted, fontSize = 21.sp)
            }
        }
    }
}

@Composable
internal fun TextEntry(title: String, initial: String, money: Boolean, onDismiss: () -> Unit, onSave: (String) -> Unit) {
    var value by remember(title, initial) { mutableStateOf(TextFieldValue(initial, selection = TextRange(0, initial.length))) }
    val focus = remember { FocusRequester() }
    val keyboard = LocalSoftwareKeyboardController.current
    LaunchedEffect(title, initial) { focus.requestFocus() }
    val cents = if (money) Money.parse(value.text) else null
    val valid = if (money) cents != null else value.text.trim().isNotEmpty()
    AlertDialog(onDismissRequest = onDismiss, title = { Text(title) },
        text = { Column {
            OutlinedTextField(value = value, onValueChange = { value = it }, singleLine = true,
                label = { Text(if (money) "Valor em reais" else "Nome ou apelido") },
                modifier = Modifier.focusRequester(focus),
                keyboardOptions = KeyboardOptions(keyboardType = if (money) KeyboardType.Decimal else KeyboardType.Text,
                    imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = { if (valid) { keyboard?.hide(); onSave(value.text) } }))
            if (money && value.text.isNotBlank() && !valid) Text("Use 900 ou 900,50", color = Color(0xFF9C4545), fontSize = 12.sp)
        } },
        confirmButton = { TextButton(enabled = valid, onClick = { keyboard?.hide(); onSave(value.text) }) { Text("Salvar") } },
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
