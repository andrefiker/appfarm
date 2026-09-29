package com.andrefiker.lootpayments

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Upsert
import androidx.room.withTransaction
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.text.Normalizer
import java.time.Instant
import java.time.YearMonth
import java.time.ZoneId
import java.util.Locale
import java.util.UUID

internal const val STATEMENT_PENDING = "PENDING"
internal const val STATEMENT_PROCESSED = "PROCESSED"
internal const val STATEMENT_IGNORED = "IGNORED"
internal const val STATEMENT_DISMISSED = "DISMISSED"

@Entity(tableName = "statement_inbox", indices = [Index("status"), Index("monthKey"), Index("matchKey")])
data class StatementInboxItem(
    @PrimaryKey val id: String,
    val source: String,
    val monthKey: Int,
    val occurredAt: Long,
    val original: String,
    val amountCents: Long,
    val matchKey: String,
    val correctedName: String = "",
    val category: String = "",
    val status: String = STATEMENT_PENDING,
    val resolvedAt: Long? = null
)

@Entity(tableName = "statement_ignore_rules", indices = [Index(value = ["pattern"], unique = true)])
data class StatementIgnoreRule(
    @PrimaryKey val id: String,
    val pattern: String,
    val label: String,
    val createdAt: Long = System.currentTimeMillis()
)

@Dao
interface StatementInboxDao {
    @Query("SELECT * FROM statement_inbox WHERE status = 'PENDING' ORDER BY occurredAt DESC, id DESC")
    fun pendingFlow(): kotlinx.coroutines.flow.Flow<List<StatementInboxItem>>
    @Query("SELECT * FROM statement_ignore_rules ORDER BY label")
    fun ignoreRulesFlow(): kotlinx.coroutines.flow.Flow<List<StatementIgnoreRule>>
    @Query("SELECT * FROM statement_inbox") suspend fun allItems(): List<StatementInboxItem>
    @Query("SELECT * FROM statement_ignore_rules") suspend fun allIgnoreRules(): List<StatementIgnoreRule>
    @Query("SELECT * FROM statement_inbox WHERE id = :id LIMIT 1") suspend fun item(id: String): StatementInboxItem?
    @Query("SELECT * FROM statement_inbox WHERE status = 'PENDING' AND matchKey = :matchKey ORDER BY occurredAt DESC, id DESC")
    suspend fun pendingMatching(matchKey: String): List<StatementInboxItem>
    @Upsert suspend fun putItem(item: StatementInboxItem)
    @Upsert suspend fun putItems(items: List<StatementInboxItem>)
    @Upsert suspend fun putIgnoreRule(rule: StatementIgnoreRule)
    @Upsert suspend fun putIgnoreRules(rules: List<StatementIgnoreRule>)
    @Query("UPDATE statement_inbox SET correctedName = :name, category = :category WHERE id = :id AND status = 'PENDING'")
    suspend fun updateDraft(id: String, name: String, category: String)
    @Query("UPDATE statement_inbox SET status = :status, resolvedAt = :resolvedAt WHERE id = :id AND status = 'PENDING'")
    suspend fun resolve(id: String, status: String, resolvedAt: Long = System.currentTimeMillis())
    @Query("UPDATE statement_inbox SET status = 'IGNORED', resolvedAt = :resolvedAt WHERE matchKey = :matchKey AND status = 'PENDING'")
    suspend fun ignoreMatching(matchKey: String, resolvedAt: Long = System.currentTimeMillis())
    @Query("DELETE FROM statement_inbox") suspend fun clearItems()
    @Query("DELETE FROM statement_ignore_rules") suspend fun clearIgnoreRules()
}

internal object StatementText {
    fun ruleLabel(original: String): String = original.substringAfter(':', original)
        .trim().substringBefore(" - ").take(80).ifBlank { original.take(80) }

    fun matchKey(original: String): String {
        val plain = Normalizer.normalize(ruleLabel(original), Normalizer.Form.NFD)
            .replace(Regex("\\p{M}+"), "")
        return plain.lowercase(Locale.ROOT).replace(Regex("[^a-z0-9]+"), " ").trim()
    }
}

internal val statementCategories = listOf(
    "Comida", "Weed", "Assinaturas/Google", "Compras", "Pods", "Faxina/limpeza",
    "Saúde", "Carro/combustível", "Uber/transporte", "Ads Mãe", "Taxas bancárias",
    "Moradia", "Lazer", "Trabalho", "Outros"
)

data class StatementInboxState(
    val items: List<StatementInboxItem> = emptyList(),
    val ignoreRules: List<StatementIgnoreRule> = emptyList(),
    val categories: List<String> = statementCategories
) {
    val totalCents: Long get() = items.sumOf { it.amountCents }
    fun sourceTotal(source: String): Long = items.filter { it.source == source }.sumOf { it.amountCents }
}

internal class StatementInboxRepository(private val db: PaymentsDatabase) {
    private val inbox = db.statementInbox()
    private val expenses = db.expenses()

    suspend fun seed(rows: List<StatementSeedRow>) = db.withTransaction {
        val existing = inbox.allItems().mapTo(mutableSetOf()) { it.id }
        val processedActualIds = expenses.allActualTransactions().mapTo(mutableSetOf()) { it.id }
        val ignored = inbox.allIgnoreRules().mapTo(mutableSetOf()) { it.pattern }
        val categoryRules = expenses.allRules().filter { it.enabled }
        val additions = rows.filter { it.id !in existing && "${it.id}-actual" !in processedActualIds }
            .map { row ->
                val matchKey = StatementText.matchKey(row.original)
                val category = categoryRules.firstOrNull {
                    row.original.contains(it.pattern, ignoreCase = true)
                }?.category.orEmpty()
                StatementInboxItem(
                    id = row.id,
                    source = row.source,
                    monthKey = StatementSeed202609.month.key(),
                    occurredAt = StatementSeed202609.occurredAt(row),
                    original = row.original,
                    amountCents = row.cents,
                    matchKey = matchKey,
                    category = category,
                    status = if (matchKey in ignored) STATEMENT_IGNORED else STATEMENT_PENDING,
                    resolvedAt = if (matchKey in ignored) System.currentTimeMillis() else null
                )
            }
        if (additions.isNotEmpty()) inbox.putItems(additions)
    }

    suspend fun updateDraft(id: String, name: String, category: String) {
        inbox.updateDraft(id, name, category)
    }

    suspend fun process(id: String, correctedName: String, category: String, rememberRule: Boolean): Boolean =
        db.withTransaction {
            val item = inbox.item(id) ?: return@withTransaction false
            if (item.status != STATEMENT_PENDING || category.isBlank()) {
                return@withTransaction false
            }
            val resolvedName = correctedName.trim().ifBlank { StatementText.ruleLabel(item.original) }
            val actualId = "${item.id}-actual"
            if (expenses.allActualTransactions().any { it.id == actualId }) {
                inbox.resolve(item.id, STATEMENT_PROCESSED)
                return@withTransaction true
            }
            val month = YearMonth.from(Instant.ofEpochMilli(item.occurredAt)
                .atZone(ZoneId.of("America/Sao_Paulo")))
            val now = System.currentTimeMillis()
            val allExpenses = expenses.allExpenses()
            val target = allExpenses.firstOrNull {
                it.active && (it.category.equals(category, ignoreCase = true) ||
                    it.name.equals(category, ignoreCase = true))
            } ?: Expense(
                id = UUID.randomUUID().toString(), name = category.trim(), defaultCents = 0,
                active = true, archivedFromMonth = null, createdMonth = month.key(),
                createdAt = now, updatedAt = now, category = category.trim(),
                spendingType = SpendingType.FLEXIBLE.stored, baselineCents = 0,
                manualCategory = true
            ).also { expenses.put(it) }
            expenses.ensureMonth(month)
            val monthRow = expenses.month(target.id, month.key()) ?: return@withTransaction false
            expenses.putMonth(monthRow.copy(
                paidCents = monthRow.paidCents + item.amountCents,
                updatedAt = now
            ))
            expenses.putActualTransaction(ActualTransaction(
                id = actualId,
                expenseId = target.id,
                monthKey = month.key(),
                occurredAt = item.occurredAt,
                amountCents = item.amountCents,
                merchant = resolvedName,
                category = category.trim(),
                source = item.source,
                note = "Original do extrato: ${item.original}",
                tags = "extrato"
            ))
            if (rememberRule) {
                val label = StatementText.ruleLabel(item.original)
                expenses.putRule(CategoryRule(
                    id = "statement-category-${item.matchKey.hashCode()}",
                    pattern = label,
                    category = category.trim(),
                    spendingType = SpendingType.FLEXIBLE.stored
                ))
            }
            inbox.updateDraft(item.id, resolvedName, category.trim())
            inbox.resolve(item.id, STATEMENT_PROCESSED)
            true
        }

    suspend fun processSimilar(
        id: String,
        correctedName: String,
        category: String,
        rememberRule: Boolean
    ): Int {
        val selected = inbox.item(id) ?: return 0
        if (selected.status != STATEMENT_PENDING || category.isBlank()) return 0
        val matches = inbox.pendingMatching(selected.matchKey)
        var processed = 0
        matches.forEach { item ->
            val name = correctedName.trim().ifBlank { StatementText.ruleLabel(item.original) }
            if (process(item.id, name, category, rememberRule)) processed++
        }
        return processed
    }

    suspend fun ignoreForever(id: String): Boolean = db.withTransaction {
        val item = inbox.item(id) ?: return@withTransaction false
        if (item.status != STATEMENT_PENDING) return@withTransaction false
        inbox.putIgnoreRule(StatementIgnoreRule(
            id = "statement-ignore-${item.matchKey.hashCode()}",
            pattern = item.matchKey,
            label = StatementText.ruleLabel(item.original)
        ))
        inbox.ignoreMatching(item.matchKey)
        true
    }

    suspend fun dismiss(id: String) = inbox.resolve(id, STATEMENT_DISMISSED)
}

class StatementInboxViewModel(application: Application) : AndroidViewModel(application) {
    private val db = PaymentsDatabase.get(application)
    private val repository = StatementInboxRepository(db)
    private val inbox = db.statementInbox()
    val state: StateFlow<StatementInboxState> = combine(
        inbox.pendingFlow(), inbox.ignoreRulesFlow(), db.expenses().expenses()
    ) { items, rules, expenses ->
        val categories = (statementCategories + expenses.map { it.category.ifBlank { it.name } })
            .filter { it.isNotBlank() }.distinctBy { it.lowercase(Locale.ROOT) }
        StatementInboxState(items, rules, categories)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), StatementInboxState())

    init { viewModelScope.launch { repository.seed(StatementSeed202609.rows) } }

    fun updateDraft(id: String, name: String, category: String) = viewModelScope.launch {
        repository.updateDraft(id, name, category)
    }

    fun process(id: String, name: String, category: String, rememberRule: Boolean) = viewModelScope.launch {
        repository.process(id, name, category, rememberRule)
    }

    fun processSimilar(id: String, name: String, category: String, rememberRule: Boolean) =
        viewModelScope.launch { repository.processSimilar(id, name, category, rememberRule) }

    fun ignoreForever(id: String) = viewModelScope.launch { repository.ignoreForever(id) }
    fun dismiss(id: String) = viewModelScope.launch { repository.dismiss(id) }
}
