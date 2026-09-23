package com.andrefiker.lootpayments

import androidx.room.Room
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.time.YearMonth

@RunWith(AndroidJUnit4::class)
class PaymentsPersistenceTest {
    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext
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
}
