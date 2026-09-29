package com.andrefiker.lootpayments

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val statementDate = DateTimeFormatter.ofPattern("dd/MM/yyyy", Locale("pt", "BR"))
private val statementHeader = Color(0xFF102F28)
private val statementDanger = Color(0xFF8C474B)

@Composable
fun StatementInboxScreen(state: StatementInboxState, vm: StatementInboxViewModel) {
    Column(Modifier.fillMaxSize().background(paper).statusBarsPadding()) {
        StatementInboxHeader(state)
        if (state.items.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Tudo processado", color = navy, fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(6.dp))
                    Text("Nenhuma saída de extrato está pendente.", color = muted, fontSize = 13.sp)
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(9.dp)
            ) {
                items(state.items, key = { it.id }) { item ->
                    StatementInboxCard(
                        item = item,
                        categories = state.categories,
                        similarCount = state.items.count { it.matchKey == item.matchKey },
                        vm = vm
                    )
                }
            }
        }
    }
}

@Composable
private fun StatementInboxHeader(state: StatementInboxState) {
    Column(
        Modifier.fillMaxWidth().background(statementHeader).padding(horizontal = 16.dp, vertical = 14.dp)
    ) {
        Text("LOOT  |  EXTRATOS", color = Color(0xFFBBD8D0), fontSize = 10.sp,
            fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
        Spacer(Modifier.height(8.dp))
        Text("Saídas para processar", color = Color.White, fontSize = 21.sp, fontWeight = FontWeight.Bold)
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom) {
            Text(ledgerMoney(state.totalCents), color = Color.White, fontSize = 30.sp,
                fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            Text("${state.items.size} pendentes", color = Color(0xFFD2DFDB), fontSize = 12.sp,
                modifier = Modifier.padding(bottom = 4.dp))
        }
        Spacer(Modifier.height(4.dp))
        Text(
            "Set 2026 · Inter ${ledgerMoney(state.sourceTotal("Inter"))} · Nubank ${ledgerMoney(state.sourceTotal("Nubank"))}",
            color = Color(0xFFD2DFDB), fontSize = 11.sp, maxLines = 2
        )
        if (state.ignoreRules.isNotEmpty()) {
            Text("${state.ignoreRules.size} regras de ignorar sempre", color = Color(0xFFBBD8D0), fontSize = 10.sp)
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StatementInboxCard(
    item: StatementInboxItem,
    categories: List<String>,
    similarCount: Int,
    vm: StatementInboxViewModel
) {
    var name by remember(item.id, item.correctedName) { mutableStateOf(item.correctedName) }
    var category by remember(item.id, item.category) { mutableStateOf(item.category) }
    var expanded by remember(item.id) { mutableStateOf(false) }
    var rememberRule by remember(item.id) { mutableStateOf(false) }
    val date = Instant.ofEpochMilli(item.occurredAt).atZone(ZoneId.of("America/Sao_Paulo"))
        .toLocalDate().format(statementDate)
    val ready = category.isNotBlank()

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, divider),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(Modifier.padding(11.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Column(Modifier.weight(1.02f)) {
                    Text("${item.source} · $date", color = teal, fontSize = 10.sp,
                        fontWeight = FontWeight.SemiBold)
                    Text(item.original, color = navy, fontSize = 13.sp, lineHeight = 18.sp,
                        maxLines = 4, overflow = TextOverflow.Ellipsis)
                    Spacer(Modifier.height(7.dp))
                    Text(ledgerMoney(item.amountCents), color = statementHeader, fontSize = 19.sp,
                        fontWeight = FontWeight.Bold)
                }
                Column(Modifier.weight(0.98f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    OutlinedTextField(
                        value = name,
                        onValueChange = {
                            name = it
                            vm.updateDraft(item.id, it, category)
                        },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        label = { Text("Nome corrigido", fontSize = 10.sp) },
                        textStyle = androidx.compose.ui.text.TextStyle(fontSize = 12.sp),
                        shape = RoundedCornerShape(11.dp)
                    )
                    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = !expanded }) {
                        OutlinedTextField(
                            value = category,
                            onValueChange = {},
                            modifier = Modifier.fillMaxWidth().menuAnchor(),
                            readOnly = true,
                            singleLine = true,
                            label = { Text("Categoria", fontSize = 10.sp) },
                            textStyle = androidx.compose.ui.text.TextStyle(fontSize = 12.sp),
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
                            shape = RoundedCornerShape(11.dp)
                        )
                        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                            categories.forEach { option ->
                                DropdownMenuItem(
                                    text = { Text(option, fontSize = 12.sp) },
                                    onClick = {
                                        category = option
                                        expanded = false
                                        vm.updateDraft(item.id, name, option)
                                    }
                                )
                            }
                        }
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(checked = rememberRule, onCheckedChange = { rememberRule = it })
                        Text("Lembrar categoria", color = muted, fontSize = 10.sp,
                            modifier = Modifier.weight(1f))
                    }
                }
            }
            Spacer(Modifier.height(4.dp))
            if (ready && similarCount > 1) {
                TextButton(
                    onClick = { vm.processSimilar(item.id, name, category, rememberRule) },
                    modifier = Modifier.align(Alignment.End),
                    contentPadding = PaddingValues(horizontal = 9.dp, vertical = 2.dp)
                ) {
                    Text(
                        "Processar $similarCount similares",
                        color = teal,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = { vm.ignoreForever(item.id) }, contentPadding = PaddingValues(horizontal = 7.dp)) {
                    Text("Ignorar sempre", color = teal, fontSize = 11.sp)
                }
                TextButton(onClick = { vm.dismiss(item.id) }, contentPadding = PaddingValues(horizontal = 7.dp)) {
                    Text("Excluir", color = statementDanger, fontSize = 11.sp)
                }
                Spacer(Modifier.weight(1f))
                Button(
                    enabled = ready,
                    onClick = { vm.process(item.id, name, category, rememberRule) },
                    colors = ButtonDefaults.buttonColors(containerColor = teal),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 13.dp, vertical = 8.dp)
                ) { Text("Processar", fontSize = 11.sp, fontWeight = FontWeight.Bold) }
            }
        }
    }
}
