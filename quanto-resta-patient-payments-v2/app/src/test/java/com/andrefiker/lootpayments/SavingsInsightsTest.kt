package com.andrefiker.lootpayments

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Test
import java.time.YearMonth

class SavingsInsightsTest {
    private val rent = Expense("rent", "Aluguel", 100_000, true, null,
        YearMonth.of(2026, 1).key(), 0L, 0L)

    @Test fun flagsMeaningfulIncreaseOnlyInPriorRecordedMonths() {
        val history = listOf(
            record(YearMonth.of(2026, 7), 100_000),
            record(YearMonth.of(2026, 8), 130_000),
            record(YearMonth.of(2026, 9), 130_000)
        )
        val tip = SavingsInsights.forMonth(YearMonth.of(2026, 9), listOf(rent), history)
        assertNotNull(tip)
        assertEquals("increase:rent:${YearMonth.of(2026, 8).key()}:130000", tip!!.key)
        assertEquals(30_000L, tip.possibleSavingCents)
    }

    @Test fun doesNotInferTrendFromOnePriorMonthAndUsesLargestPlannedExpense() {
        val history = listOf(record(YearMonth.of(2026, 9), 100_000))
        val tip = SavingsInsights.forMonth(YearMonth.of(2026, 9), listOf(rent), history)
        assertNotNull(tip)
        assertEquals(10_000L, tip!!.possibleSavingCents)
    }

    @Test fun noTipWhenThereIsNoRecordedOrPlannedSpend() {
        assertNull(SavingsInsights.forMonth(YearMonth.of(2026, 9), listOf(rent), emptyList()))
    }

    @Test fun monthlyBaselineUsesNormalizedWeedReference() {
        val baseline = MonthlyExpenseBaseline.forMonth(YearMonth.of(2026, 9), now = 1L)
        assertEquals(11, baseline.size)
        assertEquals(451338L, baseline.sumOf { it.defaultCents })
        assertEquals(40000L, baseline.single { it.name == "Weed" }.defaultCents)
    }

    private fun record(month: YearMonth, paid: Long) = ExpenseMonth(
        id = "${month.key()}", expenseId = rent.id, monthKey = month.key(), year = month.year,
        month = month.monthValue, expectedCents = paid, paidCents = paid
    )
}
