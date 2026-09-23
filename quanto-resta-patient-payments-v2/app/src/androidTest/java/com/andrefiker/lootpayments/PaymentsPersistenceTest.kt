package com.andrefiker.lootpayments

import androidx.room.Room
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.core.app.ActivityScenario
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Test
import org.junit.Rule
import org.junit.runner.RunWith
import java.time.YearMonth
import java.io.File
import java.io.FileOutputStream
import android.graphics.Bitmap
import android.graphics.Canvas

@RunWith(AndroidJUnit4::class)
class PaymentsPersistenceTest {
    @get:Rule val composeRule = createEmptyComposeRule()
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

    @Test fun renderPatientScreenWithFakeAliases() = runBlocking {
        val owner = "33333333-3333-4333-8333-333333333333"
        val dao = PaymentsDatabase.get(context).dao()
        dao.clearAll()
        context.getSharedPreferences("loot-local-owner", 0).edit().remove("id").commit()
        val month = YearMonth.now()
        val now = System.currentTimeMillis()
        val aliases = listOf("A.L.", "Marina", "Rafael", "C.S.", "Patricia", "Bruno", "L.F.", "Tiago")
        try {
            aliases.forEachIndexed { index, alias ->
                dao.putPatient(Patient("fake-patient-$index", owner, alias,
                    if (index == 0) 90000 else 75000, true, null, month.key(), now + index, now))
            }
            dao.ensureMonth(owner, month)
            val first = dao.month(owner, "fake-patient-0", month.key())!!
            val second = dao.month(owner, "fake-patient-1", month.key())!!
            dao.putMonth(first.copy(paidCents = 90000))
            dao.putMonth(second.copy(paidCents = 37500))
            val scenario = ActivityScenario.launch(MainActivity::class.java)
            try {
                composeRule.waitUntil(10_000) { composeRule.onAllNodesWithText("A.L.").fetchSemanticsNodes().isNotEmpty() }
                composeRule.onNodeWithText("A.L.").assertExists()
                composeRule.onNodeWithText("Marina").assertExists()
                captureScreen(scenario, "patient-screen-actual.png")
                composeRule.onNodeWithText("Despesas").performClick()
                composeRule.waitUntil(10_000) { composeRule.onAllNodesWithText("Nenhuma despesa ainda.").fetchSemanticsNodes().isNotEmpty() }
                composeRule.onNodeWithText("Nenhuma despesa ainda.").assertExists()
                captureScreen(scenario, "expense-screen-actual.png")
            } finally { scenario.close() }
        } finally { dao.clearAll(); context.getSharedPreferences("loot-local-owner", 0).edit().remove("id").commit() }
    }

    private fun captureScreen(scenario: ActivityScenario<MainActivity>, filename: String) {
        scenario.onActivity { activity ->
            val view = activity.window.decorView
            val bitmap = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
            view.draw(Canvas(bitmap))
            val file = File(context.getExternalFilesDir(null), filename)
            FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
            bitmap.recycle()
            assertTrue("Could not save $filename", file.length() > 1000)
        }
    }
}
