package com.andrefiker.lootpayments

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.time.YearMonth

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class LootBackupCryptoTest {
    @Test fun incomeRosterParserKeepsMonthPaymentStateAndTotal() {
        val roster = IncomeRosterJson.decode("""{
          "format":"loot-income-roster","schema":1,"month":"2026-09","markPaid":true,
          "patients":[{"name":"Pessoa A","monthlyCents":90000},{"name":"Pessoa B","monthlyCents":50000}]
        }""")
        assertEquals(YearMonth.of(2026, 9), roster.month)
        assertTrue(roster.markPaid)
        assertEquals(140000L, roster.entries.sumOf { it.monthlyCents })
    }

    @Test fun encryptedBackupRoundTripsWithoutPlaintextLeak() {
        val source = "Paciente Exemplo — R$ 900"
        val encrypted = LootBackupCrypto.encrypt(source, "senha-forte".toCharArray())
        assertNotEquals(source, encrypted)
        assertEquals(false, encrypted.contains("Paciente Exemplo"))
        assertEquals(source, LootBackupCrypto.decrypt(encrypted, "senha-forte".toCharArray()))
    }

    @Test fun wrongPasswordIsRejected() {
        val encrypted = LootBackupCrypto.encrypt("conteúdo", "senha-correta".toCharArray())
        assertThrows(Exception::class.java) {
            LootBackupCrypto.decrypt(encrypted, "senha-errada".toCharArray())
        }
    }

    @Test fun validEncryptedIncomeRosterDecodesThroughImportBoundary() {
        val plain = """{
          "format":"loot-income-roster","schema":1,"month":"2026-09","markPaid":false,
          "patients":[{"name":"Pessoa Sintética","monthlyCents":90000}]
        }"""
        val encrypted = LootBackupCrypto.encrypt(plain, "senha-forte".toCharArray())
        val decoded = IncomeRosterImportCodec.decode(encrypted, "senha-forte".toCharArray())
        assertEquals(YearMonth.of(2026, 9), decoded.month)
        assertEquals(90000L, decoded.entries.single().monthlyCents)
    }

    @Test fun wrongIncomeRosterPasswordHasControlledMessage() {
        val encrypted = LootBackupCrypto.encrypt("{}", "senha-correta".toCharArray())
        val error = assertThrows(IncomeImportException::class.java) {
            IncomeRosterImportCodec.decode(encrypted, "senha-errada".toCharArray())
        }
        assertEquals("Senha incorreta ou arquivo criptografado corrompido.", error.userMessage)
    }

    @Test fun malformedIncomeRosterHasControlledMessage() {
        val error = assertThrows(IncomeImportException::class.java) {
            IncomeRosterImportCodec.decode("não é um envelope", "senha-forte".toCharArray())
        }
        assertEquals("Arquivo de receitas inválido ou incompatível.", error.userMessage)
    }

    @Test fun incompatibleInnerRosterHasControlledMessage() {
        val encrypted = LootBackupCrypto.encrypt("{\"format\":\"outro\",\"schema\":1}", "senha-forte".toCharArray())
        val error = assertThrows(IncomeImportException::class.java) {
            IncomeRosterImportCodec.decode(encrypted, "senha-forte".toCharArray())
        }
        assertEquals("Esta lista de receitas não é compatível com esta versão do Gadgety.", error.userMessage)
    }

    @Test fun currentBackupRoundTripsBudgetAndStatementInboxData() {
        val month = YearMonth.of(2026, 9)
        val expense = Expense("food", "Comida", 147979, true, null, month.key(), 1, 2,
            category = "Comida", spendingType = SpendingType.FLEXIBLE.stored,
            baselineCents = 147979, rolloverEnabled = true, tags = "#casa",
            note = "Mercado", manualCategory = true)
        val payment = ExpenseMonth("food-sept", expense.id, month.key(), 2026, 9,
            147979, 123456, baselineCents = 147979, spendingType = SpendingType.FLEXIBLE.stored)
        val closing = MonthClosing(month.key(), 2026, 9, true, 3, 123456, 500000,
            147979, 0, 123456, 0, "Comida", 123456, 1)
        val source = LootBackup(emptyList(), emptyList(), listOf(expense), listOf(payment),
            listOf(closing), listOf(CategoryRule("r", "Merchant Example", "Comida", "FLEXIBLE")),
            listOf(SplitPart("s", payment.id, "Comida", 123456)),
            actualTransactions = listOf(ActualTransaction("tx", expense.id, month.key(), 4, 123456, "Mercado", "Comida")),
            plannedExpenses = listOf(PlannedExpense("plan", month.key(), "Projetor", "Compras", 60000, null)),
            personalRules = listOf(PersonalRule("pr", "Esperar", 30000, "Compras", 48)),
            coolingPurchases = listOf(CoolingPurchase("cool", "Projetor", "Compras", 60000, 5, 6, ruleId = "pr")),
            strategyEvents = listOf(StrategyEvent("event", "pr", "cool", "WAITED", 60000, 5)),
            statementInbox = listOf(StatementInboxItem("inbox", "Inter", month.key(), 10,
                "Compra original", 1999, "compra original", "Nome", "Compras")),
            statementIgnoreRules = listOf(StatementIgnoreRule("ignore", "andre fiker", "Andre Fiker", 11)))
        val restored = LootBackupJson.decode(LootBackupJson.encode(source), "local-owner")
        assertEquals(expense, restored.expenses.single())
        assertEquals(payment, restored.expenseMonths.single())
        assertEquals(closing, restored.closings.single())
        assertEquals("Merchant Example", restored.rules.single().pattern)
        assertEquals(123456L, restored.splitParts.single().cents)
        assertEquals(123456L, restored.actualTransactions.single().amountCents)
        assertEquals("Projetor", restored.plannedExpenses.single().name)
        assertEquals(48, restored.personalRules.single().coolingHours)
        assertEquals("WAITING", restored.coolingPurchases.single().status)
        assertEquals("WAITED", restored.strategyEvents.single().action)
        assertEquals("Nome", restored.statementInbox.single().correctedName)
        assertEquals("andre fiker", restored.statementIgnoreRules.single().pattern)
    }

    @Test fun versionOneBackupGetsSafeDefaults() {
        val json = """{
          "format":"loot-data","schema":1,"patients":[],"patientMonths":[],
          "expenses":[{"id":"old","name":"Conta antiga","defaultCents":1200,"active":true,
            "archivedFromMonth":null,"createdMonth":24321,"createdAt":1,"updatedAt":2}],
          "expenseMonths":[{"id":"old-sept","expenseId":"old","monthKey":24321,"year":2026,
            "month":9,"expectedCents":1200,"paidCents":900,"included":true,
            "forceIncomplete":false,"updatedAt":2}]
        }"""
        val restored = LootBackupJson.decode(json, "owner")
        assertEquals("Conta antiga", restored.expenses.single().category)
        assertEquals(1200L, restored.expenses.single().baselineCents)
        assertEquals(900L, restored.expenseMonths.single().paidCents)
        assertTrue(restored.rules.isEmpty())
    }
}
