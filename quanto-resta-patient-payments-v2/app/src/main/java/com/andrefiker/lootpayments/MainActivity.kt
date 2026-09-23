package com.andrefiker.lootpayments

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale

private val navy = Color(0xFF233943)
private val teal = Color(0xFF397E79)
private val muted = Color(0xFF687A7D)
private val paper = Color(0xFFF8F9F5)
private val accent = Color(0xFFE9F2EE)
private val dateFormatter = DateTimeFormatter.ofPattern("MMMM yyyy", Locale("pt", "BR"))

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = lightColorScheme(primary = teal, onPrimary = Color.White,
                background = paper, surface = Color.White, onSurface = navy)) {
                val vm: PatientPaymentsViewModel = viewModel()
                val state by vm.state.collectAsStateWithLifecycle()
                val session by vm.session.collectAsStateWithLifecycle()
                if (session == null) LoginScreen(vm) else PatientPaymentsScreen(state, vm)
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
private fun LoginScreen(vm: PatientPaymentsViewModel) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val message by vm.authMessage.collectAsStateWithLifecycle()
    Column(Modifier.fillMaxSize().padding(28.dp), verticalArrangement = Arrangement.Center) {
        Text("QUANTO RESTA", color = teal, fontSize = 12.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp)
        Spacer(Modifier.height(20.dp))
        Text("Pagamentos de pacientes", color = navy, fontSize = 28.sp, fontWeight = FontWeight.SemiBold)
        Text("Entre uma vez. Depois, seus registros continuam disponíveis sem internet.",
            color = muted, modifier = Modifier.padding(top = 12.dp, bottom = 24.dp))
        OutlinedTextField(email, { email = it }, label = { Text("E-mail") }, singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email), modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(password, { password = it }, label = { Text("Senha") }, singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password), modifier = Modifier.fillMaxWidth())
        if (message != null) Text(message!!, color = muted, modifier = Modifier.padding(top = 12.dp))
        Spacer(Modifier.height(24.dp))
        Button(enabled = email.isNotBlank() && password.length >= 6,
            onClick = { vm.signIn(email, password, false) }, modifier = Modifier.fillMaxWidth()) { Text("Entrar") }
        TextButton(enabled = email.isNotBlank() && password.length >= 6,
            onClick = { vm.signIn(email, password, true) }, modifier = Modifier.fillMaxWidth()) { Text("Criar conta") }
        Text("Use apelidos ou iniciais para identificar pacientes.", color = muted, fontSize = 12.sp,
            modifier = Modifier.padding(top = 12.dp))
    }
}

@Composable
fun PatientPaymentsScreen(state: ScreenState, vm: PatientPaymentsViewModel) {
    var editor by remember { mutableStateOf<Editor?>(null) }
    val active = state.rows.filter { it.terms.active }
    val inactive = state.rows.filterNot { it.terms.active }
    Column(Modifier.fillMaxSize().padding(horizontal = 20.dp)) {
        Spacer(Modifier.height(28.dp))
        Text("QUANTO RESTA / RECEITAS", color = teal, fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 1.4.sp)
        Spacer(Modifier.height(18.dp))
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            TextButton(onClick = { vm.shiftMonth(-1) }, modifier = Modifier.width(44.dp)) { Text("‹", fontSize = 29.sp) }
            Text(state.month.format(dateFormatter).replaceFirstChar { it.titlecase(Locale("pt", "BR")) },
                modifier = Modifier.weight(1f), color = navy, fontSize = 24.sp, fontWeight = FontWeight.SemiBold)
            TextButton(onClick = { vm.shiftMonth(1) }, modifier = Modifier.width(44.dp)) { Text("›", fontSize = 29.sp) }
        }
        Text("Pagamentos de pacientes", color = muted, fontSize = 14.sp, modifier = Modifier.padding(start = 44.dp))
        val sync by vm.syncStatus.collectAsStateWithLifecycle()
        Text(sync, color = muted, fontSize = 11.sp, modifier = Modifier.padding(start = 44.dp, top = 4.dp))
        Spacer(Modifier.height(17.dp))
        Summary(state.totals)
        Spacer(Modifier.height(18.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text("PACIENTES", color = muted, fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 1.sp)
            Text("${active.size} ativos", color = muted, fontSize = 12.sp)
        }
        Spacer(Modifier.height(9.dp))
        LazyColumn(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            if (active.isEmpty()) item {
                Text("Nenhum paciente ativo neste mês.", color = muted, modifier = Modifier.padding(vertical = 26.dp))
            }
            items(active, key = { it.patient.id }) { row -> PatientCard(row, { editor = it }) { full -> vm.setFull(row, full) } }
            if (inactive.isNotEmpty()) {
                item { Text("INATIVOS", color = muted, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 18.dp, bottom = 5.dp)) }
                items(inactive, key = { it.patient.id }) { row -> PatientCard(row, { editor = it }) { full -> vm.setFull(row, full) } }
            }
            item { Spacer(Modifier.height(10.dp)) }
        }
        Button(onClick = { editor = Editor.Add }, modifier = Modifier.fillMaxWidth().padding(bottom = 18.dp),
            shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = teal)) {
            Text("+ Adicionar paciente", modifier = Modifier.padding(vertical = 8.dp))
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
            text = { Text("Há meses anteriores registrados. Excluir definitivamente apaga esse histórico também e sincroniza a exclusão. Deseja continuar?") },
            confirmButton = { TextButton(onClick = { vm.delete(action.row.patient.id); editor = null }) { Text("Excluir definitivamente", color = Color(0xFF9C4545)) } },
            dismissButton = { TextButton(onClick = { editor = null }) { Text("Manter paciente") } })
        null -> Unit
    }
}

@Composable
private fun Summary(totals: Totals) {
    Card(colors = CardDefaults.cardColors(containerColor = accent), shape = RoundedCornerShape(19.dp)) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Text("${totals.count} pacientes  ·  ${Money.format(totals.expected)} previstos", color = navy, fontSize = 14.sp)
            Spacer(Modifier.height(12.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Column { Text("RECEBIDO", color = muted, fontSize = 11.sp); Text(Money.format(totals.paid), color = teal, fontSize = 20.sp, fontWeight = FontWeight.Bold) }
                Column(horizontalAlignment = Alignment.End) { Text("RESTANTE", color = muted, fontSize = 11.sp); Text(Money.format(totals.remaining), color = navy, fontSize = 20.sp, fontWeight = FontWeight.SemiBold) }
            }
        }
    }
}

@Composable
private fun PatientCard(row: PatientRow, edit: (Editor) -> Unit, setFull: (Boolean) -> Unit) {
    Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, Color(0xFFE6EBE8))) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(row.patient.name, color = navy, fontWeight = FontWeight.SemiBold, fontSize = 16.sp,
                        maxLines = 1, overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.clickable { edit(Editor.Name(row)) })
                    Text("${Money.format(row.terms.expectedCents)} / mês", color = muted, fontSize = 13.sp,
                        modifier = Modifier.clickable { edit(Editor.Amount(row)) })
                }
                TextButton(onClick = { edit(Editor.Manage(row)) }) { Text("Editar", color = teal, fontSize = 12.sp) }
            }
            HorizontalDivider(Modifier.padding(vertical = 8.dp), color = Color(0xFFF0F2EF))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f).clickable { edit(Editor.Paid(row)) }) {
                    Text("PAGO", color = muted, fontSize = 10.sp, letterSpacing = 1.sp)
                    Text(Money.format(row.payment.paidCents), color = navy, fontSize = 16.sp, fontWeight = FontWeight.Medium)
                }
                Text("Quitado", color = muted, fontSize = 12.sp)
                Spacer(Modifier.width(7.dp))
                Switch(checked = row.line.full, enabled = row.terms.active && row.terms.expectedCents > 0,
                    onCheckedChange = setFull)
            }
        }
    }
}

@Composable
private fun TextEntry(title: String, initial: String, money: Boolean, onDismiss: () -> Unit, onSave: (String) -> Unit) {
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
        confirmButton = { TextButton(enabled = name.trim().isNotEmpty() && cents != null, onClick = { onSave(name.trim(), cents!!) }) { Text("Adicionar") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } })
}
