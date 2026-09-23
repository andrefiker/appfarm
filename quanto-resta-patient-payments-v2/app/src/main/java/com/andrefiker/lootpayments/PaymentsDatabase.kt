package com.andrefiker.lootpayments

import android.content.Context
import androidx.room.*
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
    @Query("SELECT * FROM patients WHERE ownerId = :owner AND deletedAt IS NULL ORDER BY createdAt, id")
    fun patients(owner: String): Flow<List<Patient>>
    @Query("SELECT * FROM patient_months WHERE ownerId = :owner AND monthKey = :key")
    fun months(owner: String, key: Int): Flow<List<PatientMonth>>
    @Query("SELECT * FROM patient_months WHERE ownerId = :owner")
    fun monthsAllFlow(owner: String): Flow<List<PatientMonth>>
    @Query("SELECT * FROM patients WHERE ownerId = :owner") suspend fun allPatients(owner: String): List<Patient>
    @Query("SELECT * FROM patient_months WHERE ownerId = :owner") suspend fun allMonths(owner: String): List<PatientMonth>
    @Query("SELECT * FROM patients WHERE id = :id AND ownerId = :owner LIMIT 1") suspend fun patient(owner: String, id: String): Patient?
    @Query("SELECT * FROM patient_months WHERE ownerId = :owner AND patientId = :patientId AND monthKey = :key LIMIT 1")
    suspend fun month(owner: String, patientId: String, key: Int): PatientMonth?
    @Upsert suspend fun putPatient(patient: Patient)
    @Upsert suspend fun putMonth(month: PatientMonth)
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

@Database(entities = [Patient::class, PatientMonth::class], version = 1, exportSchema = false)
abstract class PaymentsDatabase : RoomDatabase() {
    abstract fun dao(): PaymentsDao
    companion object {
        @Volatile private var instance: PaymentsDatabase? = null
        fun get(context: Context): PaymentsDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(context.applicationContext, PaymentsDatabase::class.java, "qr-payments-v2.db")
                .build().also { instance = it }
        }
    }
}
