package com.andrefiker.lootpayments

import org.junit.Assert.*
import org.junit.Test

class PaymentRulesTest {
    @Test fun integerMoneyAndBrazilianFormatting() {
        assertEquals(90000L, Money.parse("900"))
        assertEquals(304390L, Money.parse("R$ 3.043,90"))
        assertEquals(37550L, Money.parse("375,5"))
        assertEquals(90000L, Money.parse(Money.format(90000)))
        assertNull(Money.parse("12,345"))
        assertNull(Money.parse("-5"))
        assertNull(Money.parse("999999999999999999999"))
    }
    @Test fun archivedRowsExcludedAndOverpaymentRemainingFloored() {
        val total = PaymentRules.totals(listOf(MonthLine(90000, 90000, true),
            MonthLine(75000, 37500, true), MonthLine(50000, 10000, false)))
        assertEquals(Totals(2, 165000, 127500), total)
        assertEquals(37500L, total.remaining)
        assertEquals(0L, PaymentRules.totals(listOf(MonthLine(1000, 1500, true))).remaining)
    }
    @Test fun manualEditDerivesFullAndExplicitOffKeepsAmount() {
        assertTrue(MonthLine(90000, 90000, true).full)
        assertTrue(MonthLine(90000, 95000, true).full)
        assertFalse(MonthLine(90000, 90000, true, forceIncomplete = true).full)
        assertFalse(MonthLine(90000, 89999, true).full)
        assertFalse(MonthLine(0, 0, true).full)
    }
}
