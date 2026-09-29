package com.andrefiker.lootpayments

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private enum class MorePage { ROOT, SUMMARY, FRICTION, RULES }

@Composable
fun MoreScreen(state: ExpensesState, expenses: ExpensesViewModel, incomeTotals: Totals,
    statementState: StatementInboxState, statements: StatementInboxViewModel, onData: () -> Unit) {
    var page by remember { mutableStateOf(MorePage.ROOT) }
    when (page) {
        MorePage.SUMMARY -> MoreSubpage("Resumo e histórico", { page = MorePage.ROOT }) {
            SpendingSummaryScreen(state, expenses, incomeTotals, onData)
        }
        MorePage.FRICTION -> MoreSubpage("Fricção", { page = MorePage.ROOT }) {
            BehaviorScreen(state, expenses, onData)
        }
        MorePage.RULES -> MoreSubpage("Regras de comerciantes", { page = MorePage.ROOT }) {
            MerchantRulesScreen(state.rules, statementState.ignoreRules, expenses, statements)
        }
        MorePage.ROOT -> Column(Modifier.fillMaxSize().statusBarsPadding().background(paper)
            .padding(horizontal = 14.dp)) {
            Text("GADGETY  |  MAIS", color = teal, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                letterSpacing = 1.5.sp, modifier = Modifier.padding(top = 16.dp, bottom = 12.dp))
            MoreItem("Resumo, histórico e fechamento", "Projeção, meses recentes e fechamento") { page = MorePage.SUMMARY }
            MoreItem("Regras de comerciantes", "Nomes, categorias e regras para ignorar") { page = MorePage.RULES }
            MoreItem("Fricção", "Planos, períodos de espera e regras pessoais") { page = MorePage.FRICTION }
            MoreItem("Backup e restauração", "Backup local criptografado e importações", onData)
        }
    }
}

@Composable
private fun MoreSubpage(title: String, back: () -> Unit, content: @Composable () -> Unit) {
    Column(Modifier.fillMaxSize().background(paper)) {
        Row(Modifier.fillMaxWidth().statusBarsPadding().height(42.dp).padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically) {
            Text("‹ Voltar", color = teal, fontSize = 12.sp, fontWeight = FontWeight.SemiBold,
                modifier = Modifier.clickable(onClick = back).padding(8.dp))
            Text(title, color = navy, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
                maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        Box(Modifier.weight(1f)) { content() }
    }
}

@Composable
private fun MoreItem(title: String, subtitle: String, onClick: () -> Unit) {
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 13.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(title, color = navy, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text(subtitle, color = muted, fontSize = 11.sp)
        }
        Text("›", color = teal, fontSize = 22.sp)
    }
    HorizontalDivider(color = divider)
}

@Composable
private fun MerchantRulesScreen(rules: List<CategoryRule>, ignores: List<StatementIgnoreRule>,
    expenses: ExpensesViewModel, statements: StatementInboxViewModel) {
    var editing by remember { mutableStateOf<CategoryRule?>(null) }
    LazyColumn(Modifier.fillMaxSize().padding(horizontal = 14.dp)) {
        item { Text("TRATAMENTO", color = muted, fontSize = 10.sp, fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(top = 10.dp, bottom = 5.dp)) }
        if (rules.isEmpty()) item { Text("Nenhuma regra criada.", color = muted, fontSize = 12.sp,
            modifier = Modifier.padding(vertical = 12.dp)) }
        items(rules, key = { it.id }) { rule ->
            Row(Modifier.fillMaxWidth().clickable { editing = rule }.padding(vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(rule.pattern, color = navy, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                    Text("${rule.canonicalName.ifBlank { "Mesmo nome" }} · ${rule.category} · ${if (rule.action == "IGNORE") "ignorar" else "sugerir"}",
                        color = muted, fontSize = 10.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Text("Editar", color = teal, fontSize = 11.sp)
            }
            HorizontalDivider(color = divider)
        }
        item { Text("IGNORAR SEMPRE", color = muted, fontSize = 10.sp, fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(top = 15.dp, bottom = 5.dp)) }
        items(ignores, key = { it.id }) { rule ->
            Row(Modifier.fillMaxWidth().padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(rule.label, color = navy, fontSize = 12.sp, modifier = Modifier.weight(1f),
                    maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("Remover", color = teal, fontSize = 11.sp,
                    modifier = Modifier.clickable { statements.deleteIgnoreRule(rule.id) }.padding(7.dp))
            }
        }
        item { Spacer(Modifier.height(20.dp)) }
    }
    editing?.let { original ->
        var pattern by remember(original.id) { mutableStateOf(original.pattern) }
        var name by remember(original.id) { mutableStateOf(original.canonicalName) }
        var category by remember(original.id) { mutableStateOf(original.category) }
        var action by remember(original.id) { mutableStateOf(original.action) }
        AlertDialog(onDismissRequest = { editing = null }, title = { Text("Editar regra") },
            text = { Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(pattern, { pattern = it }, label = { Text("Padrão") }, singleLine = true)
                OutlinedTextField(name, { name = it }, label = { Text("Nome") }, singleLine = true)
                OutlinedTextField(category, { category = it }, label = { Text("Categoria") }, singleLine = true)
                TextButton(onClick = { action = if (action == "IGNORE") "SUGGEST" else "IGNORE" }) {
                    Text("Ação: ${if (action == "IGNORE") "ignorar" else "sugerir"}")
                }
                TextButton(onClick = { expenses.deleteCategoryRule(original.id); editing = null }) {
                    Text("Excluir regra", color = androidx.compose.ui.graphics.Color(0xFF9C4545))
                }
            } },
            confirmButton = { TextButton(enabled = pattern.trim().length >= 3 && category.isNotBlank(), onClick = {
                expenses.saveMerchantRule(original.copy(pattern = pattern.trim(), canonicalName = name.trim(),
                    category = category.trim(), action = action))
                editing = null
            }) { Text("Salvar") } },
            dismissButton = { TextButton(onClick = { editing = null }) { Text("Cancelar") } })
    }
}
