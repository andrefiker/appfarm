package com.andrefiker.lootpayments

import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import android.content.Context
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.time.YearMonth

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class PatientDatabaseTest {
    private val context get() = ApplicationProvider.getApplicationContext<Context>()
    private val fileName = "qr-test.db"
    private val owner = "fake-owner-uuid"
    @After fun cleanup() { context.deleteDatabase(fileName) }
    @Test fun completeOfflineWorkflowSurvivesRestart() = runBlocking {
        context.deleteDatabase(fileName)
        val sep = YearMonth.of(2026, 9)
        val oct = sep.plusMonths(1)
        val id = "fake-patient-id"
        var db = Room.databaseBuilder(context, PaymentsDatabase::class.java, fileName).build()
        var dao = db.dao()
        val created = System.currentTimeMillis()
        dao.putPatient(Patient(id, owner, "A.L.", 75000, true, null, sep.key(), created, created))
        assertEquals(owner, dao.firstOwner())
        dao.ensureMonth(owner, sep)
        assertEquals(1, dao.months(owner, sep.key()).first().size)
        val september = dao.month(owner, id, sep.key())!!
        assertEquals(75000L, september.expectedCents)
        dao.putPatient(dao.patient(owner, id)!!.copy(name = "M.", revision = 2))
        assertEquals("M.", dao.patient(owner, id)!!.name)
        dao.putMonth(september.copy(paidCents = 37500, revision = 2))
        assertFalse(MonthLine(75000, 37500, true).full)
        dao.putMonth(september.copy(paidCents = 75000, revision = 3))
        assertTrue(MonthLine(75000, dao.month(owner, id, sep.key())!!.paidCents, true).full)
        dao.putMonth(september.copy(paidCents = 75000, forceIncomplete = true, revision = 4))
        assertFalse(MonthLine(75000, 75000, true, true).full)
        dao.ensureMonth(owner, oct)
        assertEquals(0L, dao.month(owner, id, oct.key())!!.paidCents)
        dao.changeDefault(owner, id, oct, 90000)
        assertEquals(75000L, dao.month(owner, id, sep.key())!!.expectedCents)
        assertEquals(90000L, dao.month(owner, id, oct.key())!!.expectedCents)
        dao.setArchive(owner, id, oct, true)
        assertFalse(dao.month(owner, id, oct.key())!!.included)
        assertTrue(dao.month(owner, id, sep.key())!!.included)
        db.close()

        db = Room.databaseBuilder(context, PaymentsDatabase::class.java, fileName).build()
        dao = db.dao()
        assertEquals(75000L, dao.month(owner, id, sep.key())!!.paidCents)
        assertEquals(75000L, dao.month(owner, id, sep.key())!!.expectedCents)
        assertEquals(0L, PaymentRules.totals(listOf(MonthLine(90000, 0, false))).remaining)
        dao.erasePatient(owner, id)
        assertEquals("", dao.patient(owner, id)!!.name)
        assertTrue(dao.allMonths(owner).isEmpty())
        db.close()
    }

    @Test fun privateIncomeRosterMergeIsIdempotentAndDoesNotDuplicateNames() = runBlocking {
        context.deleteDatabase(fileName)
        val september = YearMonth.of(2026, 9)
        val db = Room.databaseBuilder(context, PaymentsDatabase::class.java, fileName).build()
        val dao = db.dao()
        val now = System.currentTimeMillis()
        dao.putPatient(Patient("existing", owner, "Pessoa B", 0, true, null,
            september.key(), now, now))
        dao.ensureMonth(owner, september)
        val roster = IncomeRoster(september, true, listOf(
            IncomeRosterEntry("Pessoa A", 90_000),
            IncomeRosterEntry("pessoa b", 50_000)
        ))
        val first = dao.mergeIncomeRoster(owner, roster)
        val second = dao.mergeIncomeRoster(owner, roster)
        assertEquals(1, first.insertedCount)
        assertEquals(1, first.updatedCount)
        assertEquals(0, second.insertedCount)
        assertEquals(2, second.updatedCount)
        val patients = dao.backupPatients(owner)
        assertEquals(2, patients.size)
        assertEquals(140_000L, patients.sumOf { it.defaultCents })
        val months = dao.months(owner, september.key()).first()
        assertEquals(2, months.size)
        assertEquals(140_000L, months.sumOf { it.expectedCents })
        assertEquals(140_000L, months.sumOf { it.paidCents })
        db.close()
    }

    @Test fun rosterReimportUpdatesValueAndSurvivesDatabaseReopen() = runBlocking {
        context.deleteDatabase(fileName)
        val september = YearMonth.of(2026, 9)
        var db = Room.databaseBuilder(context, PaymentsDatabase::class.java, fileName).build()
        var dao = db.dao()
        dao.mergeIncomeRoster(owner, IncomeRoster(september, false,
            listOf(IncomeRosterEntry("Pessoa Sintética", 90_000))))
        val result = dao.mergeIncomeRoster(owner, IncomeRoster(september, false,
            listOf(IncomeRosterEntry("Pessoa Sintética", 95_000))))
        assertEquals(0, result.insertedCount)
        assertEquals(1, result.updatedCount)
        assertEquals(1, dao.backupPatients(owner).size)
        assertEquals(95_000L, dao.months(owner, september.key()).first().single().expectedCents)
        db.close()

        db = Room.databaseBuilder(context, PaymentsDatabase::class.java, fileName).build()
        dao = db.dao()
        assertEquals(1, dao.backupPatients(owner).size)
        assertEquals(95_000L, dao.months(owner, september.key()).first().single().expectedCents)
        db.close()
    }

}
