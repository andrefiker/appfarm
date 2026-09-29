package com.andrefiker.lootpayments

import org.junit.Assert.*
import org.junit.Test
import java.time.LocalDate
import java.time.YearMonth

class BudgetIntelligenceTest {
    private val september = YearMonth.of(2026, 9)
    private val today = LocalDate.of(2026, 9, 21)

    @Test fun remainingDailyAllowanceAndOverLimitAreDeterministic() {
        val metrics = BudgetMath.metrics(september, today, listOf(
            item("food", 342000, 475000, 475000, SpendingType.FLEXIBLE)
        ), 500000)
        assertEquals(158000L, metrics.remainingCents)
        assertEquals(10, metrics.daysRemaining)
        assertEquals(15800L, metrics.dailyAllowanceCents)
        val over = BudgetMath.metrics(september, today, listOf(
            item("food", 542000, 475000, 475000, SpendingType.FLEXIBLE)
        ), 500000)
        assertEquals(42000L, over.overCents)
        assertNull(over.dailyAllowanceCents)
    }

    @Test fun forecastIncludesKnownFixedCostsAndFlexiblePace() {
        val metrics = BudgetMath.metrics(september, LocalDate.of(2026, 9, 15), listOf(
            item("rent", 50000, 100000, 100000, SpendingType.FIXED),
            item("food", 60000, 100000, 100000, SpendingType.FLEXIBLE),
            item("extra", 30000, 0, 0, SpendingType.EXTRAORDINARY)
        ), 300000)
        assertEquals(250000L, metrics.forecastCents)
    }

    @Test fun extraordinaryCountsAsActualButNeverAsBaseline() {
        val metrics = BudgetMath.metrics(september, today, listOf(
            item("fixed", 40000, 40000, 40000, SpendingType.FIXED),
            item("flex", 30000, 50000, 50000, SpendingType.FLEXIBLE),
            item("extra", 90000, 90000, 90000, SpendingType.EXTRAORDINARY)
        ), 200000)
        assertEquals(160000L, metrics.actualCents)
        assertEquals(90000L, metrics.baselineCents)
        assertEquals(40000L, metrics.fixedCents)
        assertEquals(30000L, metrics.flexibleCents)
        assertEquals(90000L, metrics.extraordinaryCents)
    }

    @Test fun rolloverSavingsGoalAndSplitMathRemainConservative() {
        assertEquals(20000L, BudgetMath.rolloverCents(listOf(
            item("shopping", 10000, 30000, 30000, SpendingType.FLEXIBLE, rollover = true),
            item("rent", 0, 50000, 50000, SpendingType.FIXED, rollover = true)
        )))
        assertEquals(true, BudgetMath.savingsGoalPossible(700000, 450000, 200000))
        assertEquals(false, BudgetMath.savingsGoalPossible(600000, 450000, 200000))
        assertNull(BudgetMath.savingsGoalPossible(null, 450000, 200000))
        assertTrue(BudgetMath.splitIsValid(20000, listOf(12000, 8000)))
        assertFalse(BudgetMath.splitIsValid(20000, listOf(12000, 7000)))
    }

    @Test fun recurringRequiresTwoConsecutivePriorMonths() {
        val august = september.minusMonths(1)
        val july = september.minusMonths(2)
        val history = listOf(
            month("google", july, 5900), month("google", august, 6100),
            month("uber", august, 12000)
        )
        assertEquals(setOf("google"), BudgetMath.recurringExpenseIds(history, september))
    }

    @Test fun unusualSpendingNeedsHistoryAndMeaningfulIncrease() {
        val history = listOf(month("food", september.minusMonths(1), 10000),
            month("food", september.minusMonths(2), 12000))
        val unusual = BudgetMath.unusual(listOf(
            item("food", 30000, 15000, 15000, SpendingType.FLEXIBLE)
        ), history, september)
        assertEquals(1, unusual.size)
        assertEquals(19000L, unusual.single().aboveRecentCents)
    }

    private fun item(id: String, actual: Long, planned: Long, baseline: Long, type: SpendingType,
        rollover: Boolean = false) = BudgetItem(id, id, actual, planned, baseline, type,
        rolloverEnabled = rollover)

    private fun month(id: String, month: YearMonth, paid: Long) = ExpenseMonth(
        id = "$id-${month.key()}", expenseId = id, monthKey = month.key(), year = month.year,
        month = month.monthValue, expectedCents = paid, paidCents = paid)
}
