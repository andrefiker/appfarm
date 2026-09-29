package com.andrefiker.lootpayments

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import java.time.LocalDate
import java.time.YearMonth
import java.util.Locale
import kotlin.math.abs

@Composable
fun SpendingSummaryScreen(state: ExpensesState, vm: ExpensesViewModel,
    incomeTotals: Totals? = null, onData: () -> Unit = {}) {
    val suggestedLimit = state.totals.expected
    var limit by remember(state.month, suggestedLimit) { mutableStateOf(vm.spendingLimit(state.month, suggestedLimit)) }
    var limitDialog by rememberSaveable { mutableStateOf(false) }
    var closeDialog by rememberSaveable { mutableStateOf(false) }
    var goalDialog by rememberSaveable { mutableStateOf(false) }
    var whatIfCustomDialog by rememberSaveable { mutableStateOf(false) }
    var whatIfText by rememberSaveable { mutableStateOf("") }
    var whatIfAmount by rememberSaveable { mutableStateOf<Long?>(null) }
    var whatIfExpenseId by rememberSaveable { mutableStateOf<String?>(null) }
    var selectedRow by remember { mutableStateOf<ExpenseRow?>(null) }
    var limitText by remember(state.month, limitDialog) { mutableStateOf(ledgerMoney(limit)) }
    var goal by remember(state.month) { mutableStateOf(vm.savingsGoal(state.month)) }
    var goalText by remember(state.month, goalDialog) { mutableStateOf(if (goal > 0) ledgerMoney(goal) else "") }
    var encouragement by rememberSaveable { mutableStateOf(vm.encouragementEnabled()) }
    var dismissedKey by rememberSaveable { mutableStateOf(vm.dismissedTipKey()) }
    val undo by vm.undoNotice.collectAsStateWithLifecycle()
    val haptics = LocalHapticFeedback.current
    val previousKey = state.month.minusMonths(1).key()
    val rolloverCredit = state.rows.filter { row -> row.expense.rolloverEnabled &&
        SpendingType.from(row.payment.spendingType) == SpendingType.FLEXIBLE }
        .sumOf { row -> state.history.firstOrNull { it.expenseId == row.expense.id && it.monthKey == previousKey }
            ?.let { (it.expectedCents - it.paidCents).coerceAtLeast(0) } ?: 0 }
    val effectiveLimit = limit + rolloverCredit
    val metrics = BudgetMath.metrics(state.month, LocalDate.now(), state.rows.map { it.toBudgetItem() }, effectiveLimit)
    val simulated = whatIfAmount?.let { amount -> BudgetMath.metrics(state.month, LocalDate.now(),
        BudgetMath.withWhatIf(state.rows.map { it.toBudgetItem() }, amount, whatIfExpenseId), effectiveLimit) }
    val monthLabel = state.month.format(dateFormatter).replaceFirstChar { it.titlecase(Locale("pt", "BR")) }
    val tip = summaryTip(state, metrics)?.takeIf { it.key != dismissedKey }
    val topRows = state.rows.filter { it.payment.included && it.payment.paidCents > 0 }
        .sortedByDescending { it.payment.paidCents }.take(3)

    Column(Modifier.fillMaxSize().statusBarsPadding().background(paper)
        .verticalScroll(rememberScrollState()).padding(horizontal = 14.dp)) {
        LootHeader("Resumo", state.month, { vm.shiftMonth(-1) }, { vm.shiftMonth(1) },
            "Limite", onData = onData, onAdd = { limitText = ledgerMoney(limit); limitDialog = true })

        undo?.let { notice ->
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(11.dp)).background(Color(0xFFFFF5D9))
                .padding(horizontal = 11.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(notice.message + " · números recalculados", color = navy, fontSize = 11.sp,
                    modifier = Modifier.weight(1f))
                Text("DESFAZER", color = teal, fontSize = 10.sp, fontWeight = FontWeight.Bold,
                    modifier = Modifier.clickable { vm.undoLastEdit() }.padding(5.dp))
                Text("×", color = muted, modifier = Modifier.clickable { vm.dismissUndo() }.padding(5.dp))
            }
            Spacer(Modifier.height(7.dp))
        }
        Text(monthPulse(metrics), color = if (metrics.forecastVsLimitCents > 0) Color(0xFF914B47) else teal,
            fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 7.dp))

        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(accent).padding(14.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                SummaryNumber("LIMITE", effectiveLimit, Modifier.weight(1f))
                SummaryNumber("GASTO", metrics.actualCents, Modifier.weight(1f))
                SummaryNumber(if (metrics.overCents > 0) "ACIMA" else "RESTANDO",
                    if (metrics.overCents > 0) metrics.overCents else metrics.remainingCents,
                    Modifier.weight(1f), metrics.overCents > 0)
            }
            Spacer(Modifier.height(10.dp))
            val progressTarget = if (effectiveLimit > 0) (metrics.actualCents.toFloat() / effectiveLimit).coerceIn(0f, 1f) else 0f
            val progress by animateFloatAsState(progressTarget, tween(300), label = "budget-progress")
            Box(Modifier.fillMaxWidth().height(7.dp).clip(RoundedCornerShape(8.dp)).background(Color.White)) {
                Box(Modifier.fillMaxWidth(progress).height(7.dp).background(if (metrics.overCents > 0) Color(0xFFB65C56) else teal))
            }
            Spacer(Modifier.height(10.dp))
            if (rolloverCredit > 0) Text("Inclui ${ledgerMoney(rolloverCredit)} de rollover flexível",
                color = muted, fontSize = 10.sp)
            if (metrics.dailyAllowanceCents != null) {
                Text("PODE GASTAR POR DIA", color = muted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = .8.sp)
                Text("${ledgerMoney(metrics.dailyAllowanceCents)}/dia", color = teal, fontSize = 23.sp, fontWeight = FontWeight.Bold)
                Text("Hoje, até ${ledgerMoney(metrics.dailyAllowanceCents)} mantém você dentro do limite · ${metrics.daysRemaining} dias restantes",
                    color = muted, fontSize = 11.sp)
            } else if (metrics.overCents > 0) Text("Limite já ultrapassado em ${ledgerMoney(metrics.overCents)}.",
                color = Color(0xFF914B47), fontSize = 13.sp)
            else Text("Defina um limite mensal para calcular o valor por dia.", color = muted, fontSize = 12.sp)
            val currentMonth = YearMonth.from(LocalDate.now())
            val elapsedPercent = when {
                state.month < currentMonth -> 100
                state.month > currentMonth -> 0
                else -> LocalDate.now().dayOfMonth * 100 / state.month.lengthOfMonth()
            }
            val spentPercent = if (effectiveLimit > 0) (metrics.actualCents * 100 / effectiveLimit).toInt() else 0
            if (effectiveLimit > 0) Text("$elapsedPercent% do mês · $spentPercent% do limite · " +
                if (spentPercent <= elapsedPercent) "abaixo do ritmo do limite" else "gasto avança mais rápido que o mês",
                color = muted, fontSize = 10.sp, modifier = Modifier.padding(top = 6.dp))
        }

        Spacer(Modifier.height(8.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            CompactCard("MÊS REAL", metrics.actualCents, Modifier.weight(1f))
            CompactCard("MÊS-BASE", metrics.baselineCents, Modifier.weight(1f))
            val diff = metrics.differenceFromBaselineCents
            CompactCard("DIFERENÇA", abs(diff), Modifier.weight(1f),
                if (diff > 0) " acima" else if (diff < 0) " abaixo" else " igual", diff > 0)
        }

        Spacer(Modifier.height(8.dp))
        WhatIfCard(state, whatIfAmount, whatIfExpenseId, simulated, metrics,
            onQuick = { amount ->
                haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                whatIfAmount = amount
            },
            onCustom = { whatIfText = whatIfAmount?.let(::ledgerMoney).orEmpty(); whatIfCustomDialog = true },
            onCategory = { whatIfExpenseId = it },
            onApply = {
                val amount = whatIfAmount
                if (amount != null) {
                    val row = state.rows.firstOrNull { it.expense.id == whatIfExpenseId }
                    haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                    if (row != null) vm.addToPaid(row, amount) else vm.addActual("Gasto rápido", amount)
                    whatIfAmount = null; whatIfExpenseId = null
                }
            },
            onClose = { whatIfAmount = null; whatIfExpenseId = null })

        Spacer(Modifier.height(8.dp))
        WhiteCard {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("PREVISÃO DE FECHAMENTO", color = muted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    Text("~${ledgerMoney(metrics.forecastCents)}", color = navy, fontSize = 19.sp, fontWeight = FontWeight.Bold)
                    Text(if (metrics.forecastVsLimitCents > 0) "~${ledgerMoney(metrics.forecastVsLimitCents)} acima do limite"
                        else "~${ledgerMoney(-metrics.forecastVsLimitCents)} abaixo do limite",
                        color = if (metrics.forecastVsLimitCents > 0) Color(0xFF914B47) else teal, fontSize = 11.sp)
                }
                Text("estimativa", color = muted, fontSize = 10.sp)
            }
        }

        Spacer(Modifier.height(8.dp))
        WhiteCard {
            Text("COMPOSIÇÃO DO GASTO", color = muted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            TypeLine("Fixo", metrics.fixedCents)
            TypeLine("Flexível", metrics.flexibleCents)
            TypeLine("Extraordinário", metrics.extraordinaryCents)
            if (topRows.isNotEmpty()) {
                HorizontalDivider(Modifier.padding(vertical = 7.dp), color = divider)
                Text("O que mais puxou", color = navy, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                topRows.forEach { row -> Row(Modifier.fillMaxWidth().clickable { selectedRow = row }.padding(vertical = 5.dp),
                    horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(row.expense.category.ifBlank { row.expense.name }, color = navy, fontSize = 12.sp,
                        maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                    Text(ledgerMoney(row.payment.paidCents), color = muted, fontSize = 12.sp)
                } }
            }
        }

        Spacer(Modifier.height(8.dp))
        WhiteCard {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("META PARA GUARDAR", color = muted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    Text(if (goal > 0) ledgerMoney(goal) else "Não definida", color = navy, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                    if (goal > 0) Text(when (BudgetMath.savingsGoalPossible(incomeTotals?.paid, metrics.actualCents, goal)) {
                        true -> "As receitas registradas ainda permitem esta meta."
                        false -> "No ritmo registrado, esta meta ainda não cabe."
                        null -> "Sem receita suficiente registrada; meta apenas informativa."
                    }, color = muted, fontSize = 11.sp)
                }
                TextButton(onClick = { goalText = if (goal > 0) ledgerMoney(goal) else ""; goalDialog = true }) { Text("Editar") }
            }
        }

        Spacer(Modifier.height(8.dp))
        WhiteCard {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Dicas do mês", color = navy, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                if (dismissedKey != null) Text("Mostrar", color = teal, fontSize = 11.sp,
                    modifier = Modifier.clickable { dismissedKey = null; vm.showTipAgain() }.padding(6.dp))
            }
            if (tip != null) {
                Text(tip.detail, color = muted, fontSize = 12.sp, modifier = Modifier.padding(top = 5.dp))
                Text("Dispensar", color = muted, fontSize = 11.sp, modifier = Modifier.align(Alignment.End)
                    .clickable { dismissedKey = tip.key; vm.dismissTip(tip.key) }.padding(6.dp))
            } else Text("Continue registrando o gasto real para gerar comparações úteis.", color = muted, fontSize = 12.sp)
        }

        Spacer(Modifier.height(8.dp))
        WhiteCard {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                Column(Modifier.weight(1f)) {
                    Text(if (state.closing?.isClosed == true) "MÊS FECHADO" else "FECHAR MÊS",
                        color = muted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    if (state.closing?.isClosed == true) {
                        val closed = state.closing
                        val result = closed.limitCents - closed.actualCents
                        Text("Real ${ledgerMoney(closed.actualCents)} · " +
                            if (result >= 0) "${ledgerMoney(result)} abaixo do limite"
                            else "${ledgerMoney(-result)} acima do limite", color = navy, fontSize = 12.sp)
                        Text("Maior: ${closed.biggestName.ifBlank { "—" }} ${ledgerMoney(closed.biggestCents)} · " +
                            "Extraordinários ${ledgerMoney(closed.extraordinaryCents)} · ${closed.recurringCount} recorrentes",
                            color = muted, fontSize = 10.sp)
                    } else Text("Salva um resumo local; o mês continua editável.", color = navy, fontSize = 12.sp)
                }
                TextButton(onClick = { if (state.closing?.isClosed == true) vm.reopenMonth() else closeDialog = true }) {
                    Text(if (state.closing?.isClosed == true) "Reabrir" else "Fechar")
                }
            }
        }

        Spacer(Modifier.height(8.dp)); RecentMonths(state.history, state.month); Spacer(Modifier.height(10.dp))
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { Text("Mensagens de incentivo", color = navy, fontSize = 12.sp); Text("Opcional", color = muted, fontSize = 10.sp) }
            Switch(encouragement, { encouragement = it; vm.setEncouragementEnabled(it) })
        }
        if (encouragement && metrics.remainingCents > 0) Text("Você ainda tem ${ledgerMoney(metrics.remainingCents)} disponíveis neste mês.",
            color = teal, fontSize = 11.sp, modifier = Modifier.padding(bottom = 12.dp))
    }

    if (limitDialog) MoneyDialog("Limite de ${monthLabel.lowercase(Locale("pt", "BR"))}", limitText,
        { limitText = it }, { limitDialog = false }) { limit = it; vm.setSpendingLimit(state.month, it); limitDialog = false }
    if (goalDialog) MoneyDialog("Meta para guardar", goalText, { goalText = it }, { goalDialog = false }) {
        goal = it; vm.setSavingsGoal(state.month, it); goalDialog = false }
    if (whatIfCustomDialog) MoneyDialog("E se eu gastar…", whatIfText, { whatIfText = it },
        { whatIfCustomDialog = false }) { whatIfAmount = it; whatIfCustomDialog = false }
    if (closeDialog) AlertDialog(onDismissRequest = { closeDialog = false }, title = { Text("Fechar $monthLabel?") },
        text = { Text("Gasto real: ${ledgerMoney(metrics.actualCents)}\nLimite útil: ${ledgerMoney(effectiveLimit)}\nFixo: ${ledgerMoney(metrics.fixedCents)}\nFlexível: ${ledgerMoney(metrics.flexibleCents)}\nExtraordinário: ${ledgerMoney(metrics.extraordinaryCents)}\n\nO resumo fica salvo, mas o mês pode ser reaberto e editado.") },
        confirmButton = { TextButton(onClick = { vm.closeMonth(effectiveLimit); closeDialog = false }) { Text("Confirmar fechamento") } },
        dismissButton = { TextButton(onClick = { closeDialog = false }) { Text("Cancelar") } })
    selectedRow?.let { CategoryDetailDialog(it, state, vm) { selectedRow = null } }
}

@Composable private fun SummaryNumber(label: String, cents: Long, modifier: Modifier, alert: Boolean = false) {
    val animated by animateFloatAsState(cents.toFloat(), tween(300), label = "summary-$label")
    Column(modifier) { Text(label, color = muted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
        Text(ledgerMoney(animated.toLong()), color = if (alert) Color(0xFF914B47) else navy, fontSize = 15.sp,
            fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis) }
}

@Composable private fun WhatIfCard(state: ExpensesState, amount: Long?, selectedId: String?,
    simulated: BudgetMetrics?, actual: BudgetMetrics, onQuick: (Long) -> Unit, onCustom: () -> Unit,
    onCategory: (String?) -> Unit, onApply: () -> Unit, onClose: () -> Unit) {
    WhiteCard {
        Text("E SE EU GASTAR…", color = muted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(5.dp)) {
            listOf(5_000L, 10_000L, 20_000L, 50_000L).forEach { cents ->
                Text("+${cents / 100}", color = if (amount == cents) Color.White else teal, fontSize = 11.sp,
                    modifier = Modifier.clip(RoundedCornerShape(9.dp))
                        .background(if (amount == cents) teal else accent).clickable { onQuick(cents) }
                        .padding(horizontal = 10.dp, vertical = 7.dp))
            }
            Text("Outro", color = teal, fontSize = 11.sp,
                modifier = Modifier.clip(RoundedCornerShape(9.dp)).background(accent)
                    .clickable(onClick = onCustom).padding(horizontal = 10.dp, vertical = 7.dp))
        }
        if (amount != null && simulated != null) {
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(top = 7.dp),
                horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                listOf<String?>(null).plus(state.rows.filter { it.payment.included }.take(6).map { it.expense.id })
                    .forEach { id ->
                        val row = state.rows.firstOrNull { it.expense.id == id }
                        val text = row?.expense?.category?.ifBlank { row.expense.name } ?: "Geral"
                        Text(text, color = if (selectedId == id) Color.White else muted, fontSize = 10.sp,
                            modifier = Modifier.clip(RoundedCornerShape(8.dp))
                                .background(if (selectedId == id) teal else paper).clickable { onCategory(id) }
                                .padding(horizontal = 8.dp, vertical = 6.dp))
                    }
            }
            HorizontalDivider(Modifier.padding(vertical = 7.dp), color = divider)
            PreviewLine("Restante", actual.remainingCents, simulated.remainingCents)
            PreviewLine("Por dia", actual.dailyAllowanceCents ?: 0, simulated.dailyAllowanceCents ?: 0)
            PreviewLine("Previsão", actual.forecastCents, simulated.forecastCents)
            if (selectedId != null) {
                val before = state.rows.firstOrNull { it.expense.id == selectedId }?.payment?.paidCents ?: 0
                PreviewLine("Categoria", before, before + amount)
            }
            Text(if (simulated.overCents > 0) "+${ledgerMoney(simulated.overCents)} acima do limite"
                else "Ainda dentro do limite", color = if (simulated.overCents > 0) Color(0xFF914B47) else teal,
                fontSize = 11.sp, modifier = Modifier.padding(top = 5.dp))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = onClose) { Text("Fechar simulação") }
                TextButton(onClick = onApply) { Text("Aplicar como gasto") }
            }
        }
    }
}

@Composable private fun PreviewLine(label: String, before: Long, after: Long) {
    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = muted, fontSize = 11.sp)
        Text("${ledgerMoney(before)} → ${ledgerMoney(after)}",
            color = if (after > before) Color(0xFF914B47) else teal,
            fontSize = 11.sp, fontWeight = FontWeight.Medium)
    }
}

private fun monthPulse(metrics: BudgetMetrics): String = when {
    metrics.overCents > 0 -> "${ledgerMoney(metrics.overCents)} acima do limite."
    metrics.forecastVsLimitCents > 0 -> "No ritmo atual, fecha ~${ledgerMoney(metrics.forecastVsLimitCents)} acima."
    metrics.dailyAllowanceCents != null -> "${ledgerMoney(metrics.dailyAllowanceCents)}/dia mantém você dentro do limite."
    else -> "Registre o gasto real para acompanhar o mês."
}

@Composable private fun CompactCard(label: String, cents: Long, modifier: Modifier, suffix: String = "", alert: Boolean = false) {
    Column(modifier.clip(RoundedCornerShape(12.dp)).background(Color.White).padding(10.dp)) {
        Text(label, color = muted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
        Text(ledgerMoney(cents), color = if (alert) Color(0xFF914B47) else navy, fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        if (suffix.isNotEmpty()) Text(suffix, color = muted, fontSize = 9.sp)
    }
}

@Composable private fun WhiteCard(content: @Composable ColumnScope.() -> Unit) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(13.dp)).background(Color.White).padding(13.dp), content = content)
}

@Composable private fun TypeLine(label: String, cents: Long) {
    Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = muted, fontSize = 12.sp); Text(ledgerMoney(cents), color = navy, fontSize = 12.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable private fun MoneyDialog(title: String, value: String, onChange: (String) -> Unit,
    onDismiss: () -> Unit, onSave: (Long) -> Unit) {
    val parsed = Money.parse(value)
    AlertDialog(onDismissRequest = onDismiss, title = { Text(title) }, text = {
        OutlinedTextField(value, onChange, label = { Text("Valor em reais") }, singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
    }, confirmButton = { TextButton(enabled = parsed != null, onClick = { parsed?.let(onSave) }) { Text("Salvar") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } })
}

@Composable private fun RecentMonths(history: List<ExpenseMonth>, selected: YearMonth) {
    val months = (0L..2L).map { selected.minusMonths(it) }
    WhiteCard {
        Text("ÚLTIMOS MESES", color = muted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        months.forEach { month ->
            val total = history.filter { it.monthKey == month.key() && it.included }.sumOf { it.paidCents }
            Row(Modifier.fillMaxWidth().padding(top = 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(month.format(dateFormatter).replaceFirstChar { it.titlecase(Locale("pt", "BR")) }, color = navy, fontSize = 12.sp)
                Text(ledgerMoney(total), color = muted, fontSize = 12.sp)
            }
        }
    }
}

@Composable internal fun CategoryDetailDialog(row: ExpenseRow, state: ExpensesState, vm: ExpensesViewModel, onDismiss: () -> Unit) {
    var category by remember { mutableStateOf(row.expense.category.ifBlank { row.expense.name }) }
    var type by remember { mutableStateOf(SpendingType.from(row.payment.spendingType)) }
    var tags by remember { mutableStateOf(row.expense.tags) }
    var note by remember { mutableStateOf(row.expense.note) }
    var rollover by remember { mutableStateOf(row.expense.rolloverEnabled) }
    var splitOpen by remember { mutableStateOf(false) }
    if (splitOpen) {
        SplitDialog(row, vm) { splitOpen = false }
        return
    }
    AlertDialog(onDismissRequest = onDismiss, title = { Text(row.expense.name) }, text = {
        Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Atual ${ledgerMoney(row.payment.paidCents)} · Base ${ledgerMoney(row.payment.baselineCents)}", color = muted, fontSize = 12.sp)
            val impact = row.payment.paidCents - row.payment.baselineCents
            Text("Impacto atual: ${if (impact >= 0) "+" else "−"}${ledgerMoney(abs(impact))}",
                color = if (impact > 0) Color(0xFF914B47) else teal, fontSize = 11.sp,
                fontWeight = FontWeight.Medium)
            OutlinedTextField(category, { category = it }, label = { Text("Categoria") }, singleLine = true)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                SpendingType.entries.forEach { option -> Text(option.label, color = if (type == option) Color.White else teal,
                    fontSize = 10.sp, modifier = Modifier.clip(RoundedCornerShape(9.dp))
                        .background(if (type == option) teal else accent).clickable { type = option }.padding(7.dp)) }
            }
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text("Rollover flexível", color = navy, fontSize = 12.sp, modifier = Modifier.weight(1f))
                Switch(rollover, { rollover = it }, enabled = type == SpendingType.FLEXIBLE)
            }
            OutlinedTextField(tags, { tags = it }, label = { Text("Tags opcionais") }, singleLine = true)
            OutlinedTextField(note, { note = it }, label = { Text("Nota opcional") }, maxLines = 2)
            if (row.expense.id in state.recurringIds && type != SpendingType.FIXED)
                Text("Parece recorrente em 2 meses. Você pode marcar como Fixo.", color = teal, fontSize = 11.sp)
            val recent = state.history.filter { it.expenseId == row.expense.id && it.monthKey <= state.month.key() }
                .sortedByDescending { it.monthKey }.take(3)
            if (recent.isNotEmpty()) {
                Text("HISTÓRICO RECENTE", color = muted, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                recent.forEach { item ->
                    val itemMonth = YearMonth.of(item.year, item.month)
                    Text("${itemMonth.format(dateFormatter)} · ${ledgerMoney(item.paidCents)}",
                        color = navy, fontSize = 11.sp)
                }
            }
            TextButton(onClick = { vm.confirmBaseline(row); onDismiss() }) { Text("Usar gasto atual como novo mês-base") }
            TextButton(onClick = { vm.saveRule(row.expense.name, category, type); onDismiss() }) {
                Text("Criar regra para nomes parecidos")
            }
            if (row.payment.paidCents > 0) TextButton(onClick = { splitOpen = true }) { Text("Dividir gasto entre duas categorias…") }
            state.rules.filter { rule -> row.expense.name.contains(rule.pattern, ignoreCase = true) }.forEach { rule ->
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text("Regra: ${rule.pattern} → ${rule.category}", color = muted, fontSize = 10.sp,
                        modifier = Modifier.weight(1f))
                    Text("Aplicar", color = teal, fontSize = 10.sp,
                        modifier = Modifier.clickable { vm.applyRule(rule) }.padding(5.dp))
                    Text("Remover", color = Color(0xFF914B47), fontSize = 10.sp,
                        modifier = Modifier.clickable { vm.deleteRule(rule.id) }.padding(5.dp))
                }
            }
        }
    }, confirmButton = { TextButton(onClick = {
        vm.updateDetails(row, category, type, rollover && type == SpendingType.FLEXIBLE, tags, note); onDismiss()
    }) { Text("Salvar") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } })
}

@Composable private fun SplitDialog(row: ExpenseRow, vm: ExpensesViewModel, onDismiss: () -> Unit) {
    var category1 by remember { mutableStateOf("") }
    var amount1 by remember { mutableStateOf("") }
    var category2 by remember { mutableStateOf("") }
    var amount2 by remember { mutableStateOf("") }
    val first = Money.parse(amount1)
    val second = Money.parse(amount2)
    val valid = first != null && second != null && category1.isNotBlank() && category2.isNotBlank() &&
        BudgetMath.splitIsValid(row.payment.paidCents, listOf(first, second))
    AlertDialog(onDismissRequest = onDismiss, title = { Text("Dividir ${ledgerMoney(row.payment.paidCents)}") },
        text = { Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Text("A soma precisa ser exatamente o gasto original.", color = muted, fontSize = 11.sp)
            OutlinedTextField(category1, { category1 = it }, label = { Text("Categoria 1") }, singleLine = true)
            OutlinedTextField(amount1, { amount1 = it }, label = { Text("Valor 1") }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
            OutlinedTextField(category2, { category2 = it }, label = { Text("Categoria 2") }, singleLine = true)
            OutlinedTextField(amount2, { amount2 = it }, label = { Text("Valor 2") }, singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
        } }, confirmButton = { TextButton(enabled = valid, onClick = {
            vm.replaceSplit(row, listOf(category1 to first!!, category2 to second!!)); onDismiss()
        }) { Text("Salvar divisão") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancelar") } })
}

private fun summaryTip(state: ExpensesState, metrics: BudgetMetrics): SavingsTip? {
    state.unusual.firstOrNull()?.let { unusual -> return SavingsTip("unusual:${state.month.key()}:${unusual.expenseId}",
        "Acima do padrão recente", "${unusual.name} está ${ledgerMoney(unusual.aboveRecentCents)} acima do seu padrão recente.") }
    if (metrics.remainingCents > 0 && metrics.limitCents > 0) return SavingsTip("remaining:${state.month.key()}:${metrics.remainingCents}",
        "Ainda disponível", "Você ainda tem ${ledgerMoney(metrics.remainingCents)} disponíveis neste mês.")
    return state.tip
}
