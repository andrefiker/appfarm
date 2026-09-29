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
        .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5).build()

    @Test fun suppliedStatementsPopulateOnlyThePendingInbox() = runBlocking {
        context.deleteDatabase(file)
        val db = open()
        val repository = StatementInboxRepository(db)
        repository.seed(StatementSeed202609.rows)
        repository.seed(StatementSeed202609.rows)

        val pending = db.statementInbox().pendingFlow().first()
        assertEquals(180, pending.size)
        assertEquals(180, pending.map { it.id }.toSet().size)
        assertEquals(753595L, pending.filter { it.source == "Inter" }.sumOf { it.amountCents })
        assertEquals(1604574L, pending.filter { it.source == "Nubank" }.sumOf { it.amountCents })
        assertEquals(2358169L, pending.sumOf { it.amountCents })
        assertTrue(db.expenses().allActualTransactions().isEmpty())
        assertTrue(db.expenses().allMonths().isEmpty())
        db.close()
    }

    @Test fun processingMovesOneRowToActualAndRemovesItFromPending() = runBlocking {
        context.deleteDatabase(file)
        val db = open()
        val repository = StatementInboxRepository(db)
        repository.seed(StatementSeed202609.rows)
        val item = db.statementInbox().pendingFlow().first().first()

        assertTrue(repository.process(item.id, "", "Compras", rememberRule = true))
        assertFalse(repository.process(item.id, "Duplicado", "Compras", rememberRule = false))
        assertEquals(179, db.statementInbox().pendingFlow().first().size)
        assertEquals(STATEMENT_PROCESSED, db.statementInbox().item(item.id)!!.status)
        val actual = db.expenses().allActualTransactions().single()
        assertEquals(StatementText.ruleLabel(item.original), actual.merchant)
        assertEquals("Compras", actual.category)
        assertEquals(item.original, actual.note.removePrefix("Original do extrato: "))
        val category = db.expenses().allExpenses().single { it.category == "Compras" }
        assertEquals(0L, category.baselineCents)
        assertEquals(item.amountCents, db.expenses().month(category.id, item.monthKey)!!.paidCents)
        assertEquals(1, db.expenses().allRules().size)
        db.close()
    }

    @Test fun processingSimilarMovesEveryMatchingRowAndUsesOriginalNamesAsFallback() = runBlocking {
        context.deleteDatabase(file)
        val db = open()
        val repository = StatementInboxRepository(db)
        repository.seed(StatementSeed202609.rows)
        val initial = db.statementInbox().pendingFlow().first()
        val repeated = initial.first { candidate -> initial.count { it.matchKey == candidate.matchKey } > 1 }
        val matches = initial.filter { it.matchKey == repeated.matchKey }

        val processed = repository.processSimilar(
            repeated.id, correctedName = "", category = "Assinaturas/Google", rememberRule = true
        )

        assertEquals(matches.size, processed)
        assertEquals(180 - matches.size, db.statementInbox().pendingFlow().first().size)
        val actuals = db.expenses().allActualTransactions()
        assertEquals(matches.size, actuals.size)
        assertTrue(actuals.all { it.merchant.isNotBlank() && it.category == "Assinaturas/Google" })
        assertTrue(matches.all { db.statementInbox().item(it.id)!!.status == STATEMENT_PROCESSED })
        val category = db.expenses().allExpenses().single { it.category == "Assinaturas/Google" }
        assertEquals(matches.sumOf { it.amountCents }, db.expenses().month(category.id, repeated.monthKey)!!.paidCents)
        assertEquals(1, db.expenses().allRules().size)
        db.close()
    }

    @Test fun ignoreForeverAndDismissResolveWithoutCreatingActualSpending() = runBlocking {
        context.deleteDatabase(file)
        val db = open()
        val repository = StatementInboxRepository(db)
        repository.seed(StatementSeed202609.rows)
        val initial = db.statementInbox().pendingFlow().first()
        val repeated = initial.first { candidate -> initial.count { it.matchKey == candidate.matchKey } > 1 }
        val matchingCount = initial.count { it.matchKey == repeated.matchKey }
        assertTrue(repository.ignoreForever(repeated.id))
        assertEquals(180 - matchingCount, db.statementInbox().pendingFlow().first().size)
        assertEquals(1, db.statementInbox().allIgnoreRules().size)

        val dismissed = db.statementInbox().pendingFlow().first().first()
        repository.dismiss(dismissed.id)
        assertEquals(STATEMENT_DISMISSED, db.statementInbox().item(dismissed.id)!!.status)
        assertTrue(db.expenses().allActualTransactions().isEmpty())
        db.close()
    }

    @Test fun starterCategoriesHaveNoPresetAmountsAndNeverOverwriteOrDuplicate() = runBlocking {
        context.deleteDatabase(file)
        val month = YearMonth.of(2026, 9)
        val db = open()
        val dao = db.expenses()
        val now = 1L
        dao.put(Expense("mine", "Comida", 12345, true, null, month.key(), now, now))
        dao.addMissingBaselineExpenses(MonthlyExpenseBaseline.forMonth(month, now), month)
        dao.addMissingBaselineExpenses(MonthlyExpenseBaseline.forMonth(month, now), month)
        val all = dao.allExpenses()
        assertEquals(11, all.size)
        assertEquals(12345L, dao.expense("mine")!!.defaultCents)
        assertEquals(12345L, dao.months(month.key()).first().sumOf { it.expectedCents })
        assertEquals(0L, all.single { it.name == "Weed" }.defaultCents)
        assertTrue(all.filterNot { it.id == "mine" }.all {
            it.defaultCents == 0L && it.baselineCents == 0L && it.spendingType == SpendingType.FLEXIBLE.stored
        })
        db.close()
    }

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

    @Test fun versionTwoExpensesMigrateWithoutLosingActualSpending() = runBlocking {
        context.deleteDatabase(file)
        val legacy = context.openOrCreateDatabase(file, Context.MODE_PRIVATE, null)
        legacy.execSQL("""CREATE TABLE IF NOT EXISTS patients (id TEXT NOT NULL, ownerId TEXT NOT NULL, name TEXT NOT NULL, defaultCents INTEGER NOT NULL, active INTEGER NOT NULL, archivedFromMonth INTEGER, createdMonth INTEGER NOT NULL, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL, dirty INTEGER NOT NULL, deletedAt INTEGER, revision INTEGER NOT NULL, PRIMARY KEY(id))""")
        legacy.execSQL("CREATE INDEX IF NOT EXISTS index_patients_ownerId ON patients(ownerId)")
        legacy.execSQL("""CREATE TABLE IF NOT EXISTS patient_months (id TEXT NOT NULL, ownerId TEXT NOT NULL, patientId TEXT NOT NULL, monthKey INTEGER NOT NULL, year INTEGER NOT NULL, month INTEGER NOT NULL, expectedCents INTEGER NOT NULL, paidCents INTEGER NOT NULL, included INTEGER NOT NULL, forceIncomplete INTEGER NOT NULL, updatedAt INTEGER NOT NULL, dirty INTEGER NOT NULL, revision INTEGER NOT NULL, PRIMARY KEY(id), FOREIGN KEY(patientId) REFERENCES patients(id) ON UPDATE NO ACTION ON DELETE CASCADE)""")
        legacy.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS index_patient_months_patientId_monthKey ON patient_months(patientId, monthKey)")
        legacy.execSQL("CREATE INDEX IF NOT EXISTS index_patient_months_ownerId ON patient_months(ownerId)")
        legacy.execSQL("CREATE INDEX IF NOT EXISTS index_patient_months_patientId ON patient_months(patientId)")
        legacy.execSQL("""CREATE TABLE IF NOT EXISTS expenses (id TEXT NOT NULL, name TEXT NOT NULL, defaultCents INTEGER NOT NULL, active INTEGER NOT NULL, archivedFromMonth INTEGER, createdMonth INTEGER NOT NULL, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL, PRIMARY KEY(id))""")
        legacy.execSQL("""CREATE TABLE IF NOT EXISTS expense_months (id TEXT NOT NULL, expenseId TEXT NOT NULL, monthKey INTEGER NOT NULL, year INTEGER NOT NULL, month INTEGER NOT NULL, expectedCents INTEGER NOT NULL, paidCents INTEGER NOT NULL, included INTEGER NOT NULL, forceIncomplete INTEGER NOT NULL, updatedAt INTEGER NOT NULL, PRIMARY KEY(id), FOREIGN KEY(expenseId) REFERENCES expenses(id) ON UPDATE NO ACTION ON DELETE CASCADE)""")
        legacy.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS index_expense_months_expenseId_monthKey ON expense_months(expenseId, monthKey)")
        legacy.execSQL("CREATE INDEX IF NOT EXISTS index_expense_months_expenseId ON expense_months(expenseId)")
        legacy.execSQL("INSERT INTO expenses VALUES ('food', 'Comida', 147979, 1, NULL, 24321, 1, 1)")
        legacy.execSQL("INSERT INTO expense_months VALUES ('food-sept', 'food', 24321, 2026, 9, 147979, 87543, 1, 0, 2)")
        legacy.version = 2
        legacy.close()

        val db = open()
        val expense = db.expenses().expense("food")!!
        val month = db.expenses().month("food", 24321)!!
        assertEquals("Comida", expense.category)
        assertEquals(147979L, expense.baselineCents)
        assertEquals(87543L, month.paidCents)
        assertEquals(147979L, month.baselineCents)
        assertTrue(db.expenses().allClosings().isEmpty())
        db.close()
    }

    @Test fun rulesRespectManualCorrectionsAndClosingCanReopen() = runBlocking {
        context.deleteDatabase(file)
        val month = YearMonth.of(2026, 9)
        val db = open()
        val dao = db.expenses()
        dao.put(Expense("manual", "Google Brasil", 1000, true, null, month.key(), 1, 1,
            category = "Trabalho", manualCategory = true))
        dao.put(Expense("auto", "Google One", 2000, true, null, month.key(), 1, 1,
            category = "Google One"))
        dao.ensureMonth(month)
        val rule = CategoryRule("rule", "Google", "Assinaturas", SpendingType.FIXED.stored)
        dao.putRule(rule)
        dao.applyRuleToMatches(rule)
        assertEquals("Trabalho", dao.expense("manual")!!.category)
        assertEquals("Assinaturas", dao.expense("auto")!!.category)
        val closing = MonthClosing(month.key(), 2026, 9, true, 3, 3000, 5000, 3000,
            2000, 1000, 0, "Google One", 2000, 1)
        dao.putClosing(closing)
        assertTrue(dao.allClosings().single().isClosed)
        dao.putClosing(closing.copy(isClosed = false))
        assertFalse(dao.allClosings().single().isClosed)
        db.close()
    }

    @Test fun splitMustConserveTheOriginalTransaction() = runBlocking {
        context.deleteDatabase(file)
        val month = YearMonth.of(2026, 9)
        val db = open()
        val dao = db.expenses()
        dao.put(Expense("market", "Mercado", 20000, true, null, month.key(), 1, 1))
        dao.ensureMonth(month)
        val payment = dao.month("market", month.key())!!.copy(paidCents = 20000)
        dao.putMonth(payment)
        dao.replaceSplit(payment, listOf(SplitPart("a", payment.id, "Comida", 12000),
            SplitPart("b", payment.id, "Casa", 8000)))
        assertEquals(20000L, dao.allSplitParts().sumOf { it.cents })
        assertThrows(IllegalArgumentException::class.java) {
            runBlocking { dao.replaceSplit(payment, listOf(SplitPart("bad", payment.id, "Comida", 19999))) }
        }
        db.close()
    }
}
