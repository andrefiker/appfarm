package com.andrefiker.lootpayments

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.documentfile.provider.DocumentFile
import androidx.room.withTransaction
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.security.SecureRandom
import java.time.YearMonth
import java.util.Base64
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

private const val BACKUP_NAME = "loot-backup.ltb"
private const val BACKUP_FORMAT = "loot-encrypted-backup"
private const val BACKUP_SCHEMA = 4
private const val PRIVATE_INCOME_ASSET = "loot-income-2026-09.lir"

data class IncomeRosterEntry(val name: String, val monthlyCents: Long)
data class IncomeRoster(
    val month: YearMonth,
    val markPaid: Boolean,
    val entries: List<IncomeRosterEntry>
)

internal object IncomeRosterJson {
    fun decode(text: String): IncomeRoster {
        val root = JSONObject(text)
        require(root.getString("format") == "loot-income-roster" && root.getInt("schema") == 1) {
            "Lista de receitas incompatível."
        }
        val month = YearMonth.parse(root.getString("month"))
        val items = root.getJSONArray("patients")
        val rows = (0 until items.length()).map { index ->
            val item = items.getJSONObject(index)
            IncomeRosterEntry(item.getString("name").trim(), item.getLong("monthlyCents"))
        }
        require(rows.isNotEmpty() && rows.size <= 200) { "Lista de receitas inválida." }
        require(rows.all { it.name.isNotBlank() && it.name.length <= 80 && it.monthlyCents in 1..100_000_000 }) {
            "Nome ou valor inválido na lista de receitas."
        }
        require(rows.map { it.name.lowercase() }.distinct().size == rows.size) {
            "A lista contém nomes duplicados."
        }
        return IncomeRoster(month, root.optBoolean("markPaid", false), rows)
    }
}

internal data class LootBackup(
    val patients: List<Patient>,
    val patientMonths: List<PatientMonth>,
    val expenses: List<Expense>,
    val expenseMonths: List<ExpenseMonth>,
    val closings: List<MonthClosing> = emptyList(),
    val rules: List<CategoryRule> = emptyList(),
    val splitParts: List<SplitPart> = emptyList(),
    val actualTransactions: List<ActualTransaction> = emptyList(),
    val plannedExpenses: List<PlannedExpense> = emptyList(),
    val personalRules: List<PersonalRule> = emptyList(),
    val coolingPurchases: List<CoolingPurchase> = emptyList(),
    val strategyEvents: List<StrategyEvent> = emptyList(),
    val statementInbox: List<StatementInboxItem> = emptyList(),
    val statementIgnoreRules: List<StatementIgnoreRule> = emptyList()
)

internal object LootBackupCrypto {
    private const val iterations = 120_000
    private const val keyBits = 256

    fun encrypt(plainText: String, password: CharArray): String {
        require(password.size >= 6) { "Use uma senha com pelo menos 6 caracteres." }
        val salt = ByteArray(16).also { SecureRandom().nextBytes(it) }
        val iv = ByteArray(12).also { SecureRandom().nextBytes(it) }
        val key = derive(password, salt, iterations)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(128, iv))
        val encrypted = cipher.doFinal(plainText.toByteArray(Charsets.UTF_8))
        return JSONObject()
            .put("format", BACKUP_FORMAT)
            .put("cryptoVersion", 1)
            .put("iterations", iterations)
            .put("salt", Base64.getEncoder().encodeToString(salt))
            .put("iv", Base64.getEncoder().encodeToString(iv))
            .put("ciphertext", Base64.getEncoder().encodeToString(encrypted))
            .toString()
    }

    fun decrypt(envelope: String, password: CharArray): String {
        val root = JSONObject(envelope)
        require(root.getString("format") == BACKUP_FORMAT) { "Este arquivo não é um backup do Loot." }
        val salt = Base64.getDecoder().decode(root.getString("salt"))
        val iv = Base64.getDecoder().decode(root.getString("iv"))
        val encrypted = Base64.getDecoder().decode(root.getString("ciphertext"))
        val key = derive(password, salt, root.getInt("iterations"))
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, iv))
        return cipher.doFinal(encrypted).toString(Charsets.UTF_8)
    }

    private fun derive(password: CharArray, salt: ByteArray, rounds: Int): SecretKeySpec {
        val spec = PBEKeySpec(password, salt, rounds, keyBits)
        return try {
            SecretKeySpec(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).encoded, "AES")
        } finally {
            spec.clearPassword()
        }
    }
}

internal object LootBackupJson {
    fun encode(data: LootBackup): String = JSONObject()
        .put("format", "loot-data")
        .put("schema", BACKUP_SCHEMA)
        .put("exportedAt", System.currentTimeMillis())
        .put("patients", JSONArray().apply { data.patients.forEach { put(patient(it)) } })
        .put("patientMonths", JSONArray().apply { data.patientMonths.forEach { put(patientMonth(it)) } })
        .put("expenses", JSONArray().apply { data.expenses.forEach { put(expense(it)) } })
        .put("expenseMonths", JSONArray().apply { data.expenseMonths.forEach { put(expenseMonth(it)) } })
        .put("closings", JSONArray().apply { data.closings.forEach { put(closing(it)) } })
        .put("rules", JSONArray().apply { data.rules.forEach { put(rule(it)) } })
        .put("splitParts", JSONArray().apply { data.splitParts.forEach { put(splitPart(it)) } })
        .put("actualTransactions", JSONArray().apply { data.actualTransactions.forEach { put(actualTransaction(it)) } })
        .put("plannedExpenses", JSONArray().apply { data.plannedExpenses.forEach { put(plannedExpense(it)) } })
        .put("personalRules", JSONArray().apply { data.personalRules.forEach { put(personalRule(it)) } })
        .put("coolingPurchases", JSONArray().apply { data.coolingPurchases.forEach { put(coolingPurchase(it)) } })
        .put("strategyEvents", JSONArray().apply { data.strategyEvents.forEach { put(strategyEvent(it)) } })
        .put("statementInbox", JSONArray().apply { data.statementInbox.forEach { put(statementInboxItem(it)) } })
        .put("statementIgnoreRules", JSONArray().apply { data.statementIgnoreRules.forEach { put(statementIgnoreRule(it)) } })
        .toString()

    fun decode(text: String, owner: String): LootBackup {
        val root = JSONObject(text)
        val schema = root.getInt("schema")
        require(root.getString("format") == "loot-data" && schema in 1..BACKUP_SCHEMA) {
            "Versão de backup incompatível."
        }
        val patients = root.getJSONArray("patients").objects { o -> Patient(
            id = o.getString("id"), ownerId = owner, name = o.getString("name"),
            defaultCents = o.getLong("defaultCents"), active = o.getBoolean("active"),
            archivedFromMonth = o.nullableInt("archivedFromMonth"), createdMonth = o.getInt("createdMonth"),
            createdAt = o.getLong("createdAt"), updatedAt = o.getLong("updatedAt"), dirty = true,
            deletedAt = null, revision = o.optLong("revision", 1).coerceAtLeast(1)
        ) }
        val patientIds = patients.map { it.id }.toSet()
        require(patientIds.size == patients.size) { "Backup contém pacientes duplicados." }
        val patientMonths = root.getJSONArray("patientMonths").objects { o -> PatientMonth(
            id = o.getString("id"), ownerId = owner, patientId = o.getString("patientId"),
            monthKey = o.getInt("monthKey"), year = o.getInt("year"), month = o.getInt("month"),
            expectedCents = o.getLong("expectedCents"), paidCents = o.getLong("paidCents"),
            included = o.getBoolean("included"), forceIncomplete = o.getBoolean("forceIncomplete"),
            updatedAt = o.getLong("updatedAt"), dirty = true,
            revision = o.optLong("revision", 1).coerceAtLeast(1)
        ) }
        require(patientMonths.all { it.patientId in patientIds }) { "Backup contém pagamentos sem paciente." }
        val expenses = root.getJSONArray("expenses").objects { o -> Expense(
            id = o.getString("id"), name = o.getString("name"), defaultCents = o.getLong("defaultCents"),
            active = o.getBoolean("active"), archivedFromMonth = o.nullableInt("archivedFromMonth"),
            createdMonth = o.getInt("createdMonth"), createdAt = o.getLong("createdAt"),
            updatedAt = o.getLong("updatedAt"), category = o.optString("category", o.getString("name")),
            spendingType = o.optString("spendingType", SpendingType.FLEXIBLE.stored),
            baselineCents = o.optLong("baselineCents", o.getLong("defaultCents")),
            rolloverEnabled = o.optBoolean("rolloverEnabled", false), tags = o.optString("tags", ""),
            note = o.optString("note", ""), manualCategory = o.optBoolean("manualCategory", false)
        ) }
        val expenseIds = expenses.map { it.id }.toSet()
        require(expenseIds.size == expenses.size) { "Backup contém despesas duplicadas." }
        val expenseMonths = root.getJSONArray("expenseMonths").objects { o -> ExpenseMonth(
            id = o.getString("id"), expenseId = o.getString("expenseId"), monthKey = o.getInt("monthKey"),
            year = o.getInt("year"), month = o.getInt("month"), expectedCents = o.getLong("expectedCents"),
            paidCents = o.getLong("paidCents"), included = o.getBoolean("included"),
            forceIncomplete = o.getBoolean("forceIncomplete"), updatedAt = o.getLong("updatedAt"),
            baselineCents = o.optLong("baselineCents", o.getLong("expectedCents")),
            spendingType = o.optString("spendingType", SpendingType.FLEXIBLE.stored)
        ) }
        require(expenseMonths.all { it.expenseId in expenseIds }) { "Backup contém pagamentos sem despesa." }
        val closings = root.optJSONArray("closings")?.objects { o -> MonthClosing(
            o.getInt("monthKey"), o.getInt("year"), o.getInt("month"), o.getBoolean("isClosed"),
            o.getLong("closedAt"), o.getLong("actualCents"), o.getLong("limitCents"),
            o.getLong("baselineCents"), o.getLong("fixedCents"), o.getLong("flexibleCents"),
            o.getLong("extraordinaryCents"), o.getString("biggestName"), o.getLong("biggestCents"),
            o.getInt("recurringCount")) } ?: emptyList()
        val rules = root.optJSONArray("rules")?.objects { o -> CategoryRule(
            o.getString("id"), o.getString("pattern"), o.getString("category"),
            o.getString("spendingType"), o.getBoolean("enabled"), o.getLong("createdAt")) } ?: emptyList()
        val monthIds = expenseMonths.map { it.id }.toSet()
        val splits = root.optJSONArray("splitParts")?.objects { o -> SplitPart(
            o.getString("id"), o.getString("expenseMonthId"), o.getString("category"), o.getLong("cents"))
        }?.filter { it.expenseMonthId in monthIds } ?: emptyList()
        val actual = root.optJSONArray("actualTransactions")?.objects { o -> ActualTransaction(
            o.getString("id"), o.optString("expenseId").takeIf { it.isNotBlank() }, o.getInt("monthKey"),
            o.getLong("occurredAt"), o.getLong("amountCents"), o.getString("merchant"),
            o.getString("category"), o.optString("source", "MANUAL"), o.optString("note", ""),
            o.optString("tags", "")) } ?: emptyList()
        val plans = root.optJSONArray("plannedExpenses")?.objects { o -> PlannedExpense(
            o.getString("id"), o.getInt("monthKey"), o.getString("name"), o.getString("category"),
            o.getLong("amountCents"), o.nullableLong("dueAt"), o.getString("status"), o.getLong("createdAt")) } ?: emptyList()
        val personal = root.optJSONArray("personalRules")?.objects { o -> PersonalRule(
            o.getString("id"), o.getString("name"), o.getLong("thresholdCents"), o.getString("category"),
            o.getInt("coolingHours"), o.getBoolean("enabled"), o.getInt("timesUsed"),
            o.getInt("purchasesDeclined"), o.getLong("notSpentCents")) } ?: emptyList()
        val cooling = root.optJSONArray("coolingPurchases")?.objects { o -> CoolingPurchase(
            o.getString("id"), o.getString("item"), o.getString("category"), o.getLong("amountCents"),
            o.getLong("createdAt"), o.getLong("readyAt"), o.getString("status"),
            o.optString("ruleId").takeIf { it.isNotBlank() }) } ?: emptyList()
        val events = root.optJSONArray("strategyEvents")?.objects { o -> StrategyEvent(
            o.getString("id"), o.optString("ruleId").takeIf { it.isNotBlank() },
            o.optString("coolingPurchaseId").takeIf { it.isNotBlank() }, o.getString("action"),
            o.getLong("amountCents"), o.getLong("occurredAt")) } ?: emptyList()
        val inbox = root.optJSONArray("statementInbox")?.objects { o -> StatementInboxItem(
            id = o.getString("id"), source = o.getString("source"), monthKey = o.getInt("monthKey"),
            occurredAt = o.getLong("occurredAt"), original = o.getString("original"),
            amountCents = o.getLong("amountCents"), matchKey = o.getString("matchKey"),
            correctedName = o.optString("correctedName", ""), category = o.optString("category", ""),
            status = o.optString("status", STATEMENT_PENDING), resolvedAt = o.nullableLong("resolvedAt")
        ) } ?: emptyList()
        val ignoreRules = root.optJSONArray("statementIgnoreRules")?.objects { o -> StatementIgnoreRule(
            id = o.getString("id"), pattern = o.getString("pattern"), label = o.getString("label"),
            createdAt = o.getLong("createdAt")
        ) } ?: emptyList()
        return LootBackup(patients, patientMonths, expenses, expenseMonths, closings, rules, splits,
            actual, plans, personal, cooling, events, inbox, ignoreRules)
    }

    private fun patient(p: Patient) = JSONObject().put("id", p.id).put("name", p.name)
        .put("defaultCents", p.defaultCents).put("active", p.active)
        .putNullable("archivedFromMonth", p.archivedFromMonth).put("createdMonth", p.createdMonth)
        .put("createdAt", p.createdAt).put("updatedAt", p.updatedAt).put("revision", p.revision)

    private fun patientMonth(m: PatientMonth) = JSONObject().put("id", m.id).put("patientId", m.patientId)
        .put("monthKey", m.monthKey).put("year", m.year).put("month", m.month)
        .put("expectedCents", m.expectedCents).put("paidCents", m.paidCents)
        .put("included", m.included).put("forceIncomplete", m.forceIncomplete)
        .put("updatedAt", m.updatedAt).put("revision", m.revision)

    private fun expense(e: Expense) = JSONObject().put("id", e.id).put("name", e.name)
        .put("defaultCents", e.defaultCents).put("active", e.active)
        .putNullable("archivedFromMonth", e.archivedFromMonth).put("createdMonth", e.createdMonth)
        .put("createdAt", e.createdAt).put("updatedAt", e.updatedAt).put("category", e.category)
        .put("spendingType", e.spendingType).put("baselineCents", e.baselineCents)
        .put("rolloverEnabled", e.rolloverEnabled).put("tags", e.tags).put("note", e.note)
        .put("manualCategory", e.manualCategory)

    private fun expenseMonth(m: ExpenseMonth) = JSONObject().put("id", m.id).put("expenseId", m.expenseId)
        .put("monthKey", m.monthKey).put("year", m.year).put("month", m.month)
        .put("expectedCents", m.expectedCents).put("paidCents", m.paidCents)
        .put("included", m.included).put("forceIncomplete", m.forceIncomplete).put("updatedAt", m.updatedAt)
        .put("baselineCents", m.baselineCents).put("spendingType", m.spendingType)

    private fun closing(c: MonthClosing) = JSONObject().put("monthKey", c.monthKey).put("year", c.year)
        .put("month", c.month).put("isClosed", c.isClosed).put("closedAt", c.closedAt)
        .put("actualCents", c.actualCents).put("limitCents", c.limitCents).put("baselineCents", c.baselineCents)
        .put("fixedCents", c.fixedCents).put("flexibleCents", c.flexibleCents)
        .put("extraordinaryCents", c.extraordinaryCents).put("biggestName", c.biggestName)
        .put("biggestCents", c.biggestCents).put("recurringCount", c.recurringCount)

    private fun rule(r: CategoryRule) = JSONObject().put("id", r.id).put("pattern", r.pattern)
        .put("category", r.category).put("spendingType", r.spendingType).put("enabled", r.enabled)
        .put("createdAt", r.createdAt)

    private fun splitPart(p: SplitPart) = JSONObject().put("id", p.id)
        .put("expenseMonthId", p.expenseMonthId).put("category", p.category).put("cents", p.cents)

    private fun actualTransaction(t: ActualTransaction) = JSONObject().put("id", t.id)
        .put("expenseId", t.expenseId ?: "").put("monthKey", t.monthKey).put("occurredAt", t.occurredAt)
        .put("amountCents", t.amountCents).put("merchant", t.merchant).put("category", t.category)
        .put("source", t.source).put("note", t.note).put("tags", t.tags)
    private fun plannedExpense(p: PlannedExpense) = JSONObject().put("id", p.id).put("monthKey", p.monthKey)
        .put("name", p.name).put("category", p.category).put("amountCents", p.amountCents)
        .put("dueAt", p.dueAt ?: JSONObject.NULL).put("status", p.status).put("createdAt", p.createdAt)
    private fun personalRule(r: PersonalRule) = JSONObject().put("id", r.id).put("name", r.name)
        .put("thresholdCents", r.thresholdCents).put("category", r.category).put("coolingHours", r.coolingHours)
        .put("enabled", r.enabled).put("timesUsed", r.timesUsed).put("purchasesDeclined", r.purchasesDeclined)
        .put("notSpentCents", r.notSpentCents)
    private fun coolingPurchase(p: CoolingPurchase) = JSONObject().put("id", p.id).put("item", p.item)
        .put("category", p.category).put("amountCents", p.amountCents).put("createdAt", p.createdAt)
        .put("readyAt", p.readyAt).put("status", p.status).put("ruleId", p.ruleId ?: "")
    private fun strategyEvent(e: StrategyEvent) = JSONObject().put("id", e.id).put("ruleId", e.ruleId ?: "")
        .put("coolingPurchaseId", e.coolingPurchaseId ?: "").put("action", e.action)
        .put("amountCents", e.amountCents).put("occurredAt", e.occurredAt)
    private fun statementInboxItem(item: StatementInboxItem) = JSONObject().put("id", item.id)
        .put("source", item.source).put("monthKey", item.monthKey).put("occurredAt", item.occurredAt)
        .put("original", item.original).put("amountCents", item.amountCents).put("matchKey", item.matchKey)
        .put("correctedName", item.correctedName).put("category", item.category).put("status", item.status)
        .put("resolvedAt", item.resolvedAt ?: JSONObject.NULL)
    private fun statementIgnoreRule(rule: StatementIgnoreRule) = JSONObject().put("id", rule.id)
        .put("pattern", rule.pattern).put("label", rule.label).put("createdAt", rule.createdAt)

    private fun JSONObject.putNullable(key: String, value: Int?) = put(key, value ?: JSONObject.NULL)
    private fun JSONObject.nullableInt(key: String): Int? = if (isNull(key)) null else getInt(key)
    private fun JSONObject.nullableLong(key: String): Long? = if (isNull(key)) null else getLong(key)
    private fun <T> JSONArray.objects(block: (JSONObject) -> T): List<T> =
        (0 until length()).map { block(getJSONObject(it)) }
}

internal class LootDataTransfer(private val context: Context) {
    private val db = PaymentsDatabase.get(context)
    private val prefs = context.getSharedPreferences("loot-transfer", Context.MODE_PRIVATE)
    private val ownerPrefs = context.getSharedPreferences("loot-local-owner", Context.MODE_PRIVATE)

    fun savedFolder(): Uri? = prefs.getString("folder", null)?.let(Uri::parse)

    fun saveFolder(uri: Uri) {
        context.contentResolver.takePersistableUriPermission(uri,
            Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
        check(prefs.edit().putString("folder", uri.toString()).commit())
    }

    fun hasBackup(uri: Uri): Boolean = DocumentFile.fromTreeUri(context, uri)?.findFile(BACKUP_NAME)?.isFile == true

    suspend fun export(uri: Uri, password: CharArray): String = withContext(Dispatchers.IO) {
        val owner = ownerId()
        val payload = LootBackup(db.dao().backupPatients(owner), db.dao().allMonths(owner),
            db.expenses().allExpenses(), db.expenses().allMonths(), db.expenses().allClosings(),
            db.expenses().allRules(), db.expenses().allSplitParts(), db.expenses().allActualTransactions(),
            db.expenses().allPlannedExpenses(), db.expenses().allPersonalRules(),
            db.expenses().allCoolingPurchases(), db.expenses().allStrategyEvents(),
            db.statementInbox().allItems(), db.statementInbox().allIgnoreRules())
        val encrypted = LootBackupCrypto.encrypt(LootBackupJson.encode(payload), password)
        val folder = requireNotNull(DocumentFile.fromTreeUri(context, uri)) { "Pasta indisponível." }
        val file = folder.findFile(BACKUP_NAME)
            ?: requireNotNull(folder.createFile("application/octet-stream", BACKUP_NAME)) { "Não foi possível criar o backup." }
        requireNotNull(context.contentResolver.openOutputStream(file.uri, "wt")).use {
            it.write(encrypted.toByteArray(Charsets.UTF_8))
        }
        "Backup salvo: ${payload.patients.size} pacientes e ${payload.expenses.size} despesas."
    }

    fun emailBackup(uri: Uri) {
        val backup = requireNotNull(DocumentFile.fromTreeUri(context, uri)?.findFile(BACKUP_NAME)) {
            "Exporte o backup antes de enviá-lo."
        }
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "application/octet-stream"
            putExtra(Intent.EXTRA_EMAIL, arrayOf("andrefiker@gmail.com"))
            putExtra(Intent.EXTRA_SUBJECT, "Backup do Loot")
            putExtra(Intent.EXTRA_TEXT, "Backup criptografado do Loot. Guarde a senha separadamente.")
            putExtra(Intent.EXTRA_STREAM, backup.uri)
            clipData = ClipData.newUri(context.contentResolver, BACKUP_NAME, backup.uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(send, "Enviar backup do Loot").apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        })
    }

    suspend fun importPrivateIncome(password: CharArray): String = withContext(Dispatchers.IO) {
        val encrypted = context.assets.open(PRIVATE_INCOME_ASSET).bufferedReader().use { it.readText() }
        val roster = IncomeRosterJson.decode(LootBackupCrypto.decrypt(encrypted, password))
        val owner = ownerId()
        db.withTransaction { db.dao().mergeIncomeRoster(owner, roster) }
        val total = roster.entries.sumOf { it.monthlyCents }
        "${roster.entries.size} receitas adicionadas em ${roster.month}: ${Money.format(total)}."
    }

    suspend fun import(uri: Uri, password: CharArray): String = withContext(Dispatchers.IO) {
        val file = requireNotNull(DocumentFile.fromTreeUri(context, uri)?.findFile(BACKUP_NAME)) {
            "Nenhum $BACKUP_NAME encontrado nesta pasta."
        }
        val encrypted = requireNotNull(context.contentResolver.openInputStream(file.uri)).use {
            it.readBytes().toString(Charsets.UTF_8)
        }
        val payload = LootBackupJson.decode(LootBackupCrypto.decrypt(encrypted, password), ownerId())
        db.withTransaction {
            db.statementInbox().clearItems()
            db.statementInbox().clearIgnoreRules()
            db.expenses().clearAll()
            db.dao().clearAll()
            db.dao().putPatients(payload.patients)
            db.dao().putMonths(payload.patientMonths)
            db.expenses().putAll(payload.expenses)
            db.expenses().putMonths(payload.expenseMonths)
            db.expenses().putClosings(payload.closings)
            db.expenses().putRules(payload.rules)
            db.expenses().putSplitParts(payload.splitParts)
            db.expenses().putActualTransactions(payload.actualTransactions)
            db.expenses().putPlannedExpenses(payload.plannedExpenses)
            db.expenses().putPersonalRules(payload.personalRules)
            db.expenses().putCoolingPurchases(payload.coolingPurchases)
            db.expenses().putStrategyEvents(payload.strategyEvents)
            db.statementInbox().putItems(payload.statementInbox)
            db.statementInbox().putIgnoreRules(payload.statementIgnoreRules)
        }
        StatementInboxRepository(db).seed(StatementSeed202609.rows)
        val currentMonth = YearMonth.now()
        db.expenses().addOrFillFixedMonthlyCategories(
            FixedMonthlyCategories.forMonth(currentMonth), currentMonth
        )
        "Importado: ${payload.patients.size} pacientes e ${payload.expenses.size} despesas."
    }

    private suspend fun ownerId(): String {
        val id = ownerPrefs.getString("id", null) ?: db.dao().firstOwner() ?: UUID.randomUUID().toString()
        check(ownerPrefs.edit().putString("id", id).commit())
        return id
    }
}

@Composable
internal fun LootDataTransferDialog(onDismiss: () -> Unit) {
    val context = LocalContext.current
    val transfer = remember(context) { LootDataTransfer(context.applicationContext) }
    val scope = rememberCoroutineScope()
    var folder by remember { mutableStateOf(transfer.savedFolder()) }
    var password by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("Digite a senha da lista privada para carregar as receitas.") }
    var backupFound by remember { mutableStateOf(false) }
    var importing by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    val folderPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocumentTree()) { uri ->
        if (uri != null) runCatching { transfer.saveFolder(uri) }
            .onSuccess { folder = uri; backupFound = transfer.hasBackup(uri); status = if (backupFound)
                "$BACKUP_NAME encontrado." else "Pasta vinculada; nenhum backup encontrado ainda." }
            .onFailure { status = it.message ?: "Não foi possível acessar a pasta." }
    }
    LaunchedEffect(folder) { folder?.let { backupFound = runCatching { transfer.hasBackup(it) }.getOrDefault(false) } }

    if (importing) {
        AlertDialog(onDismissRequest = { if (!busy) importing = false },
            title = { Text("Substituir os dados atuais?") },
            text = { Text("A importação apaga os pacientes e despesas deste Loot e restaura exatamente o backup. Esta ação não altera outros aplicativos Loot instalados.") },
            confirmButton = { TextButton(enabled = !busy, onClick = {
                val uri = folder ?: return@TextButton
                busy = true
                scope.launch {
                    status = runCatching { transfer.import(uri, password.toCharArray()) }
                        .getOrElse { "Falha ao importar. Confira a senha e o arquivo." }
                    password = ""; busy = false; importing = false
                }
            }) { Text(if (busy) "Importando…" else "Substituir e importar", color = Color(0xFF9C4545)) } },
            dismissButton = { TextButton(enabled = !busy, onClick = { importing = false }) { Text("Cancelar") } })
        return
    }

    AlertDialog(onDismissRequest = { if (!busy) onDismiss() },
        title = { Text("Dados do Loot") },
        text = { Column(Modifier.imePadding(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Receitas de setembro", color = navy, fontWeight = FontWeight.SemiBold)
            Text("Lista privada: 22 pacientes · R$ 17.800. A importação é aditiva e não altera gastos.",
                color = muted, fontSize = 12.sp)
            OutlinedTextField(password, { password = it }, modifier = Modifier.fillMaxWidth(), singleLine = true,
                label = { Text("Senha da lista ou do backup") }, visualTransformation = PasswordVisualTransformation(),
                supportingText = { Text("Mínimo de 6 caracteres. A senha não é salva.") })
            TextButton(enabled = password.length >= 6 && !busy,
                onClick = {
                    busy = true
                    scope.launch {
                        val result = runCatching { transfer.importPrivateIncome(password.toCharArray()) }
                        password = ""; busy = false
                        result.onSuccess {
                            status = it
                            onDismiss()
                        }.onFailure {
                            status = "Falha ao carregar a lista: ${it.message ?: it.javaClass.simpleName}."
                        }
                    }
                }, modifier = Modifier.fillMaxWidth()) {
                Text(if (busy) "Carregando…" else "Carregar 22 pacientes")
            }
            androidx.compose.material3.HorizontalDivider(color = divider)
            Text("Backup local criptografado", color = navy, fontWeight = FontWeight.SemiBold)
            Text("Escolha uma pasta uma vez. Outras versões podem selecionar a mesma pasta e detectar $BACKUP_NAME.",
                color = muted, fontSize = 12.sp)
            TextButton(onClick = { folderPicker.launch(folder) }, modifier = Modifier.fillMaxWidth()) {
                Text(if (folder == null) "Escolher pasta" else "Trocar pasta")
            }
            Text(if (backupFound) "✓ Backup encontrado" else "Nenhum backup detectado",
                color = if (backupFound) teal else muted, fontSize = 12.sp)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                TextButton(enabled = folder != null && password.length >= 6 && !busy, onClick = {
                    val uri = folder ?: return@TextButton
                    busy = true
                    scope.launch {
                        status = runCatching { transfer.export(uri, password.toCharArray()) }
                            .getOrElse { it.message ?: "Falha ao exportar." }
                        backupFound = runCatching { transfer.hasBackup(uri) }.getOrDefault(false)
                        password = ""; busy = false
                    }
                }) { Text(if (busy) "Salvando…" else "Exportar") }
                TextButton(enabled = backupFound && password.length >= 6 && !busy,
                    onClick = { importing = true }) { Text("Importar") }
            }
            TextButton(enabled = folder != null && password.length >= 6 && !busy,
                onClick = {
                    val uri = folder ?: return@TextButton
                    busy = true
                    scope.launch {
                        status = runCatching {
                            val result = transfer.export(uri, password.toCharArray())
                            transfer.emailBackup(uri)
                            "$result E-mail preparado para andrefiker@gmail.com."
                        }.getOrElse { it.message ?: "Falha ao preparar o e-mail." }
                        backupFound = runCatching { transfer.hasBackup(uri) }.getOrDefault(false)
                        password = ""; busy = false
                    }
                }, modifier = Modifier.fillMaxWidth()) {
                Text(if (busy) "Preparando…" else "Enviar backup por e-mail")
            }
            Spacer(Modifier.height(2.dp))
            Text(status, color = muted, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 2.dp))
        } },
        confirmButton = { TextButton(enabled = !busy, onClick = onDismiss) { Text("Fechar") } })
}
