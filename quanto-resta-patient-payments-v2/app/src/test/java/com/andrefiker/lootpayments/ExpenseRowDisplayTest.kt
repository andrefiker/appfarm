package com.andrefiker.lootpayments

import org.junit.Assert.assertEquals
import org.junit.Test

class ExpenseRowDisplayTest {
    @Test fun principalValueIsExpectedWhenNothingHasBeenPaid() {
        val display = expenseRowDisplay(expectedCents = 300_000, paidCents = 0)
        assertEquals(300_000L, display.principalCents)
        assertEquals(0L, display.paidCents)
        assertEquals(300_000L, display.remainingCents)
    }

    @Test fun principalExpectedAndPaidRemainIndependent() {
        val display = expenseRowDisplay(expectedCents = 300_000, paidCents = 41_230)
        assertEquals(300_000L, display.principalCents)
        assertEquals(41_230L, display.paidCents)
        assertEquals(258_770L, display.remainingCents)
    }
}
