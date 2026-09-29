package com.andrefiker.lootpayments

import android.content.Context
import androidx.room.*
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.flow.Flow
import java.time.YearMonth
import java.util.UUID

@Entity(tableName = "patients", indices = [Index("ownerId")])
data class Patient(
    @PrimaryKey val id: String,
    val ownerId: String,
    val name: String,
    val defaultCents: Long,
    val active: Boolean,
    val archivedFromMonth: Int?,
    val createdMonth: Int,
    val createdAt: Long,
    val updatedAt: Long,
    val dirty: Boolean = true,
    val deletedAt: Long? = null,
    val revision: Long = 1
)

@Entity(tableName = "patient_months",
    indices = [Index(value = ["patientId", "monthKey"], unique = true), Index("ownerId"), Index("patientId")],
    foreignKeys = [ForeignKey(entity = Patient::class, parentColumns = ["id"], childColumns = ["patientId"], onDelete = ForeignKey.CASCADE)])
data class PatientMonth(
    @PrimaryKey val id: String,
    val ownerId: String,
    val patientId: String,
    val monthKey: Int,
    val year: Int,
    val month: Int,
    val expectedCents: Long,
    val paidCents: Long = 0,
    val included: Boolean = true,
    val forceIncomplete: Boolean = false,
    val updatedAt: Long = System.currentTimeMillis(),
    val dirty: Boolean = true,
    val revision: Long = 1
)

fun YearMonth.key(): Int = year * 12 + monthValue

@Dao
interface PaymentsDao {
    /** Reuse the on-device owner when upgrading from the sign-in build. */
    @Query("SELECT ownerId FROM patients WHERE deletedAt IS NULL ORDER BY createdAt LIMIT 1")
    suspend fun firstOwner(): String?
    @Query("SELECT * FROM patients WHERE ownerId = :owner AND deletedAt IS NULL ORDER BY createdAt, id")
    fun patients(owner: String): Flow<List<Patient>>
    @Query("SELECT * FROM patient_months WHERE ownerId = :owner AND monthKey = :key")
    fun months(owner: String, key: Int): Flow<List<PatientMonth>>
    @Query("SELECT * FROM patient_months WHERE ownerId = :owner")
    fun monthsAllFlow(owner: String): Flow<List<PatientMonth>>
    @Query("SELECT * FROM patients WHERE ownerId = :owner") suspend fun allPatients(owner: String): List<Patient>
    @Query("SELECT * FROM patients WHERE ownerId = :owner AND deletedAt IS NULL") suspend fun backupPatients(owner: String): List<Patient>
    @Query("SELECT * FROM patient_months WHERE ownerId = :owner") suspend fun allMonths(owner: String): List<PatientMonth>
    @Query("SELECT * FROM patients WHERE id = :id AND ownerId = :owner LIMIT 1") suspend fun patient(owner: String, id: String): Patient?
    @Query("SELECT * FROM patient_months WHERE ownerId = :owner AND patientId = :patientId AND monthKey = :key LIMIT 1")
    suspend fun month(owner: String, patientId: String, key: Int): PatientMonth?
    @Upsert suspend fun putPatient(patient: Patient)
    @Upsert suspend fun putPatients(patients: List<Patient>)
    @Upsert suspend fun putMonth(month: PatientMonth)
    @Upsert suspend fun putMonths(months: List<PatientMonth>)
    @Query("UPDATE patients SET dirty = 0 WHERE id = :id AND ownerId = :owner AND revision = :revision")
    suspend fun markPatientSynced(owner: String, id: String, revision: Long)
    @Query("UPDATE patient_months SET dirty = 0 WHERE id = :id AND ownerId = :owner AND revision = :revision")
    suspend fun markMonthSynced(owner: String, id: String, revision: Long)
    @Query("DELETE FROM patient_months WHERE ownerId = :owner AND patientId = :patientId")
    suspend fun deleteMonths(owner: String, patientId: String)
    @Query("DELETE FROM patient_months WHERE ownerId = :owner AND id = :id AND dirty = 0")
    suspend fun deleteCleanMonth(owner: String, id: String)
    @Query("DELETE FROM patients WHERE ownerId = :owner AND id = :id AND dirty = 0")
    suspend fun deleteCleanPatient(owner: String, id: String)
    @Query("DELETE FROM patient_months") suspend fun clearMonths()
    @Query("DELETE FROM patients") suspend fun clearPatients()

    @Transaction suspend fun ensureMonth(owner: String, selected: YearMonth) {
        val key = selected.key()
        val existing = allMonths(owner).filter { it.monthKey == key }.map { it.patientId }.toSet()
        for (patient in allPatients(owner)) {
            if (patient.deletedAt != null || patient.createdMonth > key || existing.contains(patient.id)) continue
            putMonth(PatientMonth(UUID.randomUUID().toString(), owner, patient.id, key,
                selected.year, selected.monthValue, patient.defaultCents,
                included = patient.archivedFromMonth == null || key < patient.archivedFromMonth))
        }
    }

    @Transaction suspend fun changeDefault(owner: String, id: String, selected: YearMonth, cents: Long) {
        val patient = patient(owner, id) ?: return
        snapshotPrior(owner, patient, selected.key())
        val now = System.currentTimeMillis()
        putPatient(patient.copy(defaultCents = cents, updatedAt = now, revision = patient.revision + 1, dirty = true))
        allMonths(owner).filter { it.patientId == id && it.monthKey >= selected.key() }.forEach {
            putMonth(it.copy(expectedCents = cents, updatedAt = now, revision = it.revision + 1, dirty = true))
        }
    }

    @Transaction suspend fun setArchive(owner: String, id: String, selected: YearMonth, archive: Boolean) {
        val patient = patient(owner, id) ?: return
        snapshotPrior(owner, patient, selected.key())
        val now = System.currentTimeMillis()
        putPatient(patient.copy(active = !archive, archivedFromMonth = if (archive) selected.key() else null,
            updatedAt = now, revision = patient.revision + 1, dirty = true))
        allMonths(owner).filter { it.patientId == id && it.monthKey >= selected.key() }.forEach {
            putMonth(it.copy(included = !archive, expectedCents = if (archive) it.expectedCents else patient.defaultCents,
                updatedAt = now, revision = it.revision + 1, dirty = true))
        }
    }

    @Transaction suspend fun erasePatient(owner: String, id: String) {
        val patient = patient(owner, id) ?: return
        val now = System.currentTimeMillis()
        deleteMonths(owner, id)
        putPatient(patient.copy(name = "", defaultCents = 0, active = false, archivedFromMonth = null,
            deletedAt = now, updatedAt = now, revision = patient.revision + 1, dirty = true))
    }

    @Transaction suspend fun clearAll() { clearMonths(); clearPatients() }

    /** Freeze every earlier fee before changing the default, even if an old month was never opened. */
    private suspend fun snapshotPrior(owner: String, patient: Patient, before: Int) {
        val saved = allMonths(owner).filter { it.patientId == patient.id }.map { it.monthKey }.toSet()
        for (key in patient.createdMonth until before) {
            if (key in saved || (patient.archivedFromMonth != null && key >= patient.archivedFromMonth)) continue
            val year = (key - 1) / 12
            val month = (key - 1) % 12 + 1
            putMonth(PatientMonth(UUID.randomUUID().toString(), owner, patient.id, key, year, month, patient.defaultCents))
        }
    }
}

/** Only adds empty tables. No legacy expense data is read or imported. */
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("""CREATE TABLE IF NOT EXISTS `expenses` (`id` TEXT NOT NULL, `name` TEXT NOT NULL, `defaultCents` INTEGER NOT NULL, `active` INTEGER NOT NULL, `archivedFromMonth` INTEGER, `createdMonth` INTEGER NOT NULL, `createdAt` INTEGER NOT NULL, `updatedAt` INTEGER NOT NULL, PRIMARY KEY(`id`))""")
        db.execSQL("""CREATE TABLE IF NOT EXISTS `expense_months` (`id` TEXT NOT NULL, `expenseId` TEXT NOT NULL, `monthKey` INTEGER NOT NULL, `year` INTEGER NOT NULL, `month` INTEGER NOT NULL, `expectedCents` INTEGER NOT NULL, `paidCents` INTEGER NOT NULL, `included` INTEGER NOT NULL, `forceIncomplete` INTEGER NOT NULL, `updatedAt` INTEGER NOT NULL, PRIMARY KEY(`id`), FOREIGN KEY(`expenseId`) REFERENCES `expenses`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE)""")
        db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_expense_months_expenseId_monthKey` ON `expense_months` (`expenseId`, `monthKey`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_expense_months_expenseId` ON `expense_months` (`expenseId`)")
    }
}

/** Additive v1.7 -> v1.8 migration. Actual paid values and all existing rows remain untouched. */
val MIGRATION_2_3 = object : Migration(2, 3) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE `expenses` ADD COLUMN `category` TEXT NOT NULL DEFAULT ''")
        db.execSQL("ALTER TABLE `expenses` ADD COLUMN `spendingType` TEXT NOT NULL DEFAULT 'FLEXIBLE'")
        db.execSQL("ALTER TABLE `expenses` ADD COLUMN `baselineCents` INTEGER NOT NULL DEFAULT 0")
        db.execSQL("ALTER TABLE `expenses` ADD COLUMN `rolloverEnabled` INTEGER NOT NULL DEFAULT 0")
        db.execSQL("ALTER TABLE `expenses` ADD COLUMN `tags` TEXT NOT NULL DEFAULT ''")
        db.execSQL("ALTER TABLE `expenses` ADD COLUMN `note` TEXT NOT NULL DEFAULT ''")
        db.execSQL("ALTER TABLE `expenses` ADD COLUMN `manualCategory` INTEGER NOT NULL DEFAULT 0")
        db.execSQL("UPDATE `expenses` SET `category` = `name`, `baselineCents` = `defaultCents`")
        db.execSQL("ALTER TABLE `expense_months` ADD COLUMN `baselineCents` INTEGER NOT NULL DEFAULT 0")
        db.execSQL("ALTER TABLE `expense_months` ADD COLUMN `spendingType` TEXT NOT NULL DEFAULT 'FLEXIBLE'")
        db.execSQL("UPDATE `expense_months` SET `baselineCents` = `expectedCents`")
        db.execSQL("""CREATE TABLE IF NOT EXISTS `month_closings` (`monthKey` INTEGER NOT NULL, `year` INTEGER NOT NULL, `month` INTEGER NOT NULL, `isClosed` INTEGER NOT NULL, `closedAt` INTEGER NOT NULL, `actualCents` INTEGER NOT NULL, `limitCents` INTEGER NOT NULL, `baselineCents` INTEGER NOT NULL, `fixedCents` INTEGER NOT NULL, `flexibleCents` INTEGER NOT NULL, `extraordinaryCents` INTEGER NOT NULL, `biggestName` TEXT NOT NULL, `biggestCents` INTEGER NOT NULL, `recurringCount` INTEGER NOT NULL, PRIMARY KEY(`monthKey`))""")
        db.execSQL("""CREATE TABLE IF NOT EXISTS `category_rules` (`id` TEXT NOT NULL, `pattern` TEXT NOT NULL, `category` TEXT NOT NULL, `spendingType` TEXT NOT NULL, `enabled` INTEGER NOT NULL, `createdAt` INTEGER NOT NULL, PRIMARY KEY(`id`))""")
        db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS `index_category_rules_pattern` ON `category_rules` (`pattern`)")
        db.execSQL("""CREATE TABLE IF NOT EXISTS `split_parts` (`id` TEXT NOT NULL, `expenseMonthId` TEXT NOT NULL, `category` TEXT NOT NULL, `cents` INTEGER NOT NULL, PRIMARY KEY(`id`), FOREIGN KEY(`expenseMonthId`) REFERENCES `expense_months`(`id`) ON UPDATE NO ACTION ON DELETE CASCADE)""")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_split_parts_expenseMonthId` ON `split_parts` (`expenseMonthId`)")
    }
}

/** Explicit local-first behavioral models; existing ledgers remain authoritative and untouched. */
val MIGRATION_3_4 = object : Migration(3, 4) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("""CREATE TABLE IF NOT EXISTS `actual_transactions` (`id` TEXT NOT NULL, `expenseId` TEXT, `monthKey` INTEGER NOT NULL, `occurredAt` INTEGER NOT NULL, `amountCents` INTEGER NOT NULL, `merchant` TEXT NOT NULL, `category` TEXT NOT NULL, `source` TEXT NOT NULL, `note` TEXT NOT NULL, `tags` TEXT NOT NULL, PRIMARY KEY(`id`))""")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_actual_transactions_monthKey` ON `actual_transactions` (`monthKey`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_actual_transactions_expenseId` ON `actual_transactions` (`expenseId`)")
        db.execSQL("""CREATE TABLE IF NOT EXISTS `planned_expenses` (`id` TEXT NOT NULL, `monthKey` INTEGER NOT NULL, `name` TEXT NOT NULL, `category` TEXT NOT NULL, `amountCents` INTEGER NOT NULL, `dueAt` INTEGER, `status` TEXT NOT NULL, `createdAt` INTEGER NOT NULL, PRIMARY KEY(`id`))""")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_planned_expenses_monthKey` ON `planned_expenses` (`monthKey`)")
        db.execSQL("""CREATE TABLE IF NOT EXISTS `personal_rules` (`id` TEXT NOT NULL, `name` TEXT NOT NULL, `thresholdCents` INTEGER NOT NULL, `category` TEXT NOT NULL, `coolingHours` INTEGER NOT NULL, `enabled` INTEGER NOT NULL, `timesUsed` INTEGER NOT NULL, `purchasesDeclined` INTEGER NOT NULL, `notSpentCents` INTEGER NOT NULL, PRIMARY KEY(`id`))""")
        db.execSQL("""CREATE TABLE IF NOT EXISTS `cooling_purchases` (`id` TEXT NOT NULL, `item` TEXT NOT NULL, `category` TEXT NOT NULL, `amountCents` INTEGER NOT NULL, `createdAt` INTEGER NOT NULL, `readyAt` INTEGER NOT NULL, `status` TEXT NOT NULL, `ruleId` TEXT, PRIMARY KEY(`id`))""")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_cooling_purchases_status` ON `cooling_purchases` (`status`)")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_cooling_purchases_ruleId` ON `cooling_purchases` (`ruleId`)")
        db.execSQL("""CREATE TABLE IF NOT EXISTS `strategy_events` (`id` TEXT NOT NULL, `ruleId` TEXT, `coolingPurchaseId` TEXT, `action` TEXT NOT NULL, `amountCents` INTEGER NOT NULL, `occurredAt` INTEGER NOT NULL, PRIMARY KEY(`id`))""")
        db.execSQL("CREATE INDEX IF NOT EXISTS `index_strategy_events_ruleId` ON `strategy_events` (`ruleId`)")
    }
}

@Database(entities = [Patient::class, PatientMonth::class, Expense::class, ExpenseMonth::class,
    MonthClosing::class, CategoryRule::class, SplitPart::class, ActualTransaction::class,
    PlannedExpense::class, PersonalRule::class, CoolingPurchase::class, StrategyEvent::class],
    version = 4, exportSchema = false)
abstract class PaymentsDatabase : RoomDatabase() {
    abstract fun dao(): PaymentsDao
    abstract fun expenses(): ExpensesDao
    companion object {
        @Volatile private var instance: PaymentsDatabase? = null
        fun get(context: Context): PaymentsDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(context.applicationContext, PaymentsDatabase::class.java, "qr-payments-v2.db")
                .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4)
                .build().also { instance = it }
        }
    }
}
