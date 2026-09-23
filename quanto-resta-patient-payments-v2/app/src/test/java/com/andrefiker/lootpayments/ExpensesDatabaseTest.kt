package com.andrefiker.lootpayments

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.time.YearMonth

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class ExpensesPersistenceTest {
    private val context get() = ApplicationProvider.getApplicationContext<Context>()
    private val file = "expenses-v1-test.db"
    @After fun cleanup() { context.deleteDatabase(file) }
    private fun open() = Room.databaseBuilder(context, PaymentsDatabase::class.java, file)
        .addMigrations(MIGRATION_1_2).build()

    @Test fun blankStartMonthSnapshotsArchiveDeleteAndRestart() = runBlocking {
        context.deleteDatabase(file)
        val sept = YearMonth.of(2026, 9)
        val oct = sept.plusMonths(1)
        val id = "11111111-1111-4111-8111-111111111111"
        val now = System.currentTimeMillis()
        var db = open()
        var dao = db.expenses()
        assertTrue(dao.allExpenses().isEmpty())
        assertTrue(dao.allMonths().isEmpty())
        assertTrue(db.dao().allPatients("local").isEmpty())
        dao.put(Expense(id, "Conta fictícia", 15000, true, null, sept.key(), now, now))
        dao.ensureMonth(sept)
        assertEquals(1, dao.months(sept.key()).first().size)
        assertEquals(15000L, dao.month(id, sept.key())!!.expectedCents)
        dao.put(dao.expense(id)!!.copy(name = "Conta de teste"))
        assertEquals("Conta de teste", dao.expense(id)!!.name)
        dao.putMonth(dao.month(id, sept.key())!!.copy(paidCents = 7500))
        assertFalse(MonthLine(15000, 7500, true).full)
        assertEquals(7500L, PaymentRules.totals(listOf(MonthLine(15000, 7500, true))).remaining)
        dao.putMonth(dao.month(id, sept.key())!!.copy(paidCents = 15000))
        assertTrue(MonthLine(15000, dao.month(id, sept.key())!!.paidCents, true).full)
        dao.putMonth(dao.month(id, sept.key())!!.copy(forceIncomplete = true))
        assertFalse(MonthLine(15000, 15000, true, true).full)
        dao.putMonth(dao.month(id, sept.key())!!.copy(paidCents = 17000, forceIncomplete = false))
        assertTrue(MonthLine(15000, 17000, true).full)
        assertEquals(17000L, dao.month(id, sept.key())!!.paidCents)
        dao.ensureMonth(oct)
        dao.ensureMonth(oct)
        assertEquals(1, dao.months(oct.key()).first().size)
        assertEquals(0L, dao.month(id, oct.key())!!.paidCents)
        assertEquals(15000L, dao.month(id, oct.key())!!.expectedCents)
        dao.changeDefault(id, oct, 17000)
        assertEquals(15000L, dao.month(id, sept.key())!!.expectedCents)
        assertEquals(17000L, dao.month(id, oct.key())!!.expectedCents)
        dao.setArchive(id, oct, true)
        assertFalse(dao.month(id, oct.key())!!.included)
        assertTrue(dao.month(id, sept.key())!!.included)
        db.close()
        db = open()
        dao = db.expenses()
        assertEquals(17000L, dao.month(id, sept.key())!!.paidCents)
        assertEquals(15000L, dao.month(id, sept.key())!!.expectedCents)
        dao.setArchive(id, oct, false)
        assertTrue(dao.month(id, oct.key())!!.included)
        assertEquals(17000L, dao.month(id, oct.key())!!.expectedCents)
        dao.delete(id)
        assertTrue(dao.allExpenses().isEmpty())
        assertTrue(dao.allMonths().isEmpty())
        db.close()
    }

    @Test fun versionOnePatientDataSurvivesWhileExpensesStartEmpty() = runBlocking {
        context.deleteDatabase(file)
        val legacy = context.openOrCreateDatabase(file, Context.MODE_PRIVATE, null)
        legacy.execSQL("""CREATE TABLE IF NOT EXISTS patients (id TEXT NOT NULL, ownerId TEXT NOT NULL, name TEXT NOT NULL, defaultCents INTEGER NOT NULL, active INTEGER NOT NULL, archivedFromMonth INTEGER, createdMonth INTEGER NOT NULL, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL, dirty INTEGER NOT NULL, deletedAt INTEGER, revision INTEGER NOT NULL, PRIMARY KEY(id))""")
        legacy.execSQL("CREATE INDEX IF NOT EXISTS index_patients_ownerId ON patients(ownerId)")
        legacy.execSQL("""CREATE TABLE IF NOT EXISTS patient_months (id TEXT NOT NULL, ownerId TEXT NOT NULL, patientId TEXT NOT NULL, monthKey INTEGER NOT NULL, year INTEGER NOT NULL, month INTEGER NOT NULL, expectedCents INTEGER NOT NULL, paidCents INTEGER NOT NULL, included INTEGER NOT NULL, forceIncomplete INTEGER NOT NULL, updatedAt INTEGER NOT NULL, dirty INTEGER NOT NULL, revision INTEGER NOT NULL, PRIMARY KEY(id), FOREIGN KEY(patientId) REFERENCES patients(id) ON UPDATE NO ACTION ON DELETE CASCADE)""")
        legacy.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS index_patient_months_patientId_monthKey ON patient_months(patientId, monthKey)")
        legacy.execSQL("CREATE INDEX IF NOT EXISTS index_patient_months_ownerId ON patient_months(ownerId)")
        legacy.execSQL("CREATE INDEX IF NOT EXISTS index_patient_months_patientId ON patient_months(patientId)")
        legacy.execSQL("INSERT INTO patients VALUES ('fake-patient', 'fake-owner', 'A.L.', 90000, 1, NULL, 24321, 1, 1, 1, NULL, 1)")
        legacy.execSQL("INSERT INTO patient_months VALUES ('fake-month', 'fake-owner', 'fake-patient', 24321, 2026, 9, 90000, 37500, 1, 0, 1, 1, 1)")
        legacy.version = 1
        legacy.close()
        val db = open()
        assertEquals("A.L.", db.dao().patient("fake-owner", "fake-patient")!!.name)
        assertEquals(37500L, db.dao().month("fake-owner", "fake-patient", 24321)!!.paidCents)
        assertTrue(db.expenses().allExpenses().isEmpty())
        assertTrue(db.expenses().allMonths().isEmpty())
        db.close()
    }
}
