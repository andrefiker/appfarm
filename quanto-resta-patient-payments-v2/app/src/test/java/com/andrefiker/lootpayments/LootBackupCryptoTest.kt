package com.andrefiker.lootpayments

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.time.YearMonth

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [33])
class LootBackupCryptoTest {
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

    @Test fun versionTwoBackupRoundTripsBudgetIntelligenceData() {
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
            listOf(closing), listOf(CategoryRule("r", "Patrícia", "Comida", "FLEXIBLE")),
            listOf(SplitPart("s", payment.id, "Comida", 123456)))
        val restored = LootBackupJson.decode(LootBackupJson.encode(source), "local-owner")
        assertEquals(expense, restored.expenses.single())
        assertEquals(payment, restored.expenseMonths.single())
        assertEquals(closing, restored.closings.single())
        assertEquals("Patrícia", restored.rules.single().pattern)
        assertEquals(123456L, restored.splitParts.single().cents)
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
