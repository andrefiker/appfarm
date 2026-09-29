package com.andrefiker.lootpayments

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.Duration
import java.time.LocalDate

@Composable
fun BehaviorScreen(state: ExpensesState, vm: ExpensesViewModel, onData: () -> Unit = {}) {
    var urgeOpen by remember { mutableStateOf(false) }
    var planOpen by remember { mutableStateOf(false) }
    var ruleOpen by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().statusBarsPadding().background(paper)
        .verticalScroll(rememberScrollState()).padding(horizontal = 14.dp)) {
        LootHeader("Fricção", state.month, { vm.shiftMonth(-1) }, { vm.shiftMonth(1) },
            "Quero comprar", onData = onData, onAdd = { urgeOpen = true })
        BehaviorCard {
            Text("TEM ALGO VINDO POR AÍ?", style = smallTitle)
            Text("Custos planejados entram na previsão, nunca no gasto real.", color = muted, fontSize = 11.sp)
            TextButton(onClick = { planOpen = true }) { Text("+ Adicionar custo futuro") }
            state.plannedExpenses.forEach { plan ->
                BehaviorRow(plan.name, ledgerMoney(plan.amountCents), "Remover") { vm.deletePlan(plan.id) }
            }
        }
        Spacer(Modifier.height(8.dp))
        BehaviorCard {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("MINHAS REGRAS", style = smallTitle)
                Text("Adicionar", color = teal, fontSize = 11.sp,
                    modifier = Modifier.clickable { ruleOpen = true }.padding(4.dp))
            }
            if (state.personalRules.isEmpty()) Text("Nenhuma regra. Você decide quando criar fricção.", color = muted, fontSize = 11.sp)
            state.personalRules.forEach { rule ->
                val stats = BehaviorScience.strategyStats(rule, state.strategyEvents)
                Column(Modifier.fillMaxWidth().padding(vertical = 6.dp)) {
                    Text(rule.name, color = navy, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    Text("Se compra > ${ledgerMoney(rule.thresholdCents)}${if (rule.category.isBlank()) "" else " em ${rule.category}"}, esperar ${rule.coolingHours}h",
                        color = muted, fontSize = 10.sp)
                    Text("Usada ${stats.uses}× · ${stats.declined} compras não realizadas após usar a regra · ${ledgerMoney(stats.notSpentCents)} não gastos",
                        color = muted, fontSize = 10.sp)
                    Text("Remover", color = Color(0xFF914B47), fontSize = 10.sp,
                        modifier = Modifier.clickable { vm.deletePersonalRule(rule.id) }.padding(vertical = 4.dp))
                }
            }
        }
        Spacer(Modifier.height(8.dp))
        BehaviorCard {
            Text("AGUARDANDO", style = smallTitle)
            if (state.coolingPurchases.isEmpty()) Text("Nenhuma compra em período de espera.", color = muted, fontSize = 11.sp)
            state.coolingPurchases.forEach { item ->
                val ready = BehaviorScience.coolingReady(item, System.currentTimeMillis())
                val hours = Duration.ofMillis((item.readyAt - System.currentTimeMillis()).coerceAtLeast(0)).toHours()
                Column(Modifier.fillMaxWidth().padding(vertical = 7.dp)) {
                    Text("${item.item} · ${ledgerMoney(item.amountCents)}", color = navy, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    Text(if (ready) "Período concluído; a decisão continua sua." else "Disponível para rever em ~${hours + 1}h",
                        color = muted, fontSize = 10.sp)
                    Row {
                        TextButton(onClick = { vm.buyCooling(item) }) { Text("Comprar") }
                        TextButton(onClick = { vm.postponeCooling(item) }) { Text("Adiar") }
                        TextButton(onClick = { vm.discardCooling(item) }) { Text("Descartar") }
                    }
                }
            }
        }
        Spacer(Modifier.height(14.dp))
    }
    if (urgeOpen) UrgeDialog(state, vm) { urgeOpen = false }
    if (planOpen) PlanDialog(vm) { planOpen = false }
    if (ruleOpen) RuleDialog(vm) { ruleOpen = false }
}

private val smallTitle = androidx.compose.ui.text.TextStyle(color = muted, fontSize = 10.sp,
    fontWeight = FontWeight.Bold, letterSpacing = .8.sp)

@Composable private fun BehaviorCard(content: @Composable ColumnScope.() -> Unit) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(13.dp)).background(Color.White).padding(13.dp), content = content)
}

@Composable private fun BehaviorRow(left: String, right: String, action: String, onAction: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(left, color = navy, fontSize = 12.sp, modifier = Modifier.weight(1f))
        Text(right, color = muted, fontSize = 11.sp)
        Text(action, color = Color(0xFF914B47), fontSize = 10.sp,
            modifier = Modifier.clickable(onClick = onAction).padding(start = 8.dp))
    }
}

@Composable private fun UrgeDialog(state: ExpensesState, vm: ExpensesViewModel, onDismiss: () -> Unit) {
    var item by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("Compras") }
    var amountText by remember { mutableStateOf("") }
    val amount = Money.parse(amountText)
    val rule = amount?.let { BehaviorScience.matchingRule(state.personalRules, it, category) }
    val limit = vm.spendingLimit(state.month, state.totals.expected)
    val current = BudgetMath.metrics(state.month, LocalDate.now(), state.rows.map { it.toBudgetItem() }, limit,
        state.plannedExpenses.sumOf { it.amountCents })
    val preview = amount?.let { BudgetMath.metrics(state.month, LocalDate.now(),
        BudgetMath.withWhatIf(state.rows.map { row -> row.toBudgetItem() }, it), limit,
        state.plannedExpenses.sumOf { plan -> plan.amountCents }) }
    AlertDialog(onDismissRequest = onDismiss, title = { Text("Quero comprar") }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
            OutlinedTextField(item, { item = it }, label = { Text("Item (opcional)") }, singleLine = true)
            OutlinedTextField(category, { category = it }, label = { Text("Categoria") }, singleLine = true)
            OutlinedTextField(amountText, { amountText = it }, label = { Text("Valor") }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
            if (preview != null) {
                Text("Restante ${ledgerMoney(current.remainingCents)} → ${ledgerMoney(preview.remainingCents)}", fontSize = 11.sp)
                Text("Por dia ${ledgerMoney(current.dailyAllowanceCents ?: 0)} → ${ledgerMoney(preview.dailyAllowanceCents ?: 0)}", fontSize = 11.sp)
                Text("Previsão ${ledgerMoney(current.forecastCents)} → ${ledgerMoney(preview.forecastCents)}", fontSize = 11.sp)
                rule?.let { Text("Sua regra sugere esperar ${it.coolingHours}h.", color = teal, fontSize = 11.sp) }
            }
        }
    }, confirmButton = {
        Row {
            TextButton(enabled = amount != null, onClick = { vm.addActual(item.ifBlank { "Compra" }, amount!!, category); onDismiss() }) { Text("Comprar agora") }
            TextButton(enabled = amount != null, onClick = { vm.addCooling(item, category, amount!!, rule); onDismiss() }) { Text("Esperar") }
        }
    }, dismissButton = { TextButton(enabled = amount != null, onClick = { vm.addPlan(item.ifBlank { "Compra planejada" }, category, amount!!); onDismiss() }) { Text("Salvar na lista") } })
}

@Composable private fun PlanDialog(vm: ExpensesViewModel, onDismiss: () -> Unit) {
    var name by remember { mutableStateOf("") }; var category by remember { mutableStateOf("Outro") }
    var amountText by remember { mutableStateOf("") }; val amount = Money.parse(amountText)
    AlertDialog(onDismissRequest = onDismiss, title = { Text("Custo futuro") }, text = { Column {
        OutlinedTextField(name, { name = it }, label = { Text("O que vem por aí?") })
        OutlinedTextField(category, { category = it }, label = { Text("Categoria") })
        OutlinedTextField(amountText, { amountText = it }, label = { Text("Valor previsto") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
    } }, confirmButton = { TextButton(enabled = name.isNotBlank() && amount != null, onClick = { vm.addPlan(name, category, amount!!); onDismiss() }) { Text("Salvar plano") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } })
}

@Composable private fun RuleDialog(vm: ExpensesViewModel, onDismiss: () -> Unit) {
    var name by remember { mutableStateOf("Esperar antes de compra grande") }
    var category by remember { mutableStateOf("") }; var amountText by remember { mutableStateOf("300") }
    var hoursText by remember { mutableStateOf("48") }; val amount = Money.parse(amountText); val hours = hoursText.toIntOrNull()
    AlertDialog(onDismissRequest = onDismiss, title = { Text("Minha regra") }, text = { Column {
        OutlinedTextField(name, { name = it }, label = { Text("Nome") })
        OutlinedTextField(amountText, { amountText = it }, label = { Text("Se compra maior que") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
        OutlinedTextField(category, { category = it }, label = { Text("Categoria (opcional)") })
        OutlinedTextField(hoursText, { hoursText = it }, label = { Text("Esperar quantas horas") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
    } }, confirmButton = { TextButton(enabled = name.isNotBlank() && amount != null && hours != null, onClick = {
        vm.addPersonalRule(name, amount!!, category, hours!!); onDismiss()
    }) { Text("Salvar regra") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } })
}
