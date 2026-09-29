package com.andrefiker.lootpayments

import java.time.LocalDate
import java.time.YearMonth
import kotlin.math.roundToLong

enum class SpendingType(val stored: String, val label: String) {
    FIXED("FIXED", "Fixo"),
    FLEXIBLE("FLEXIBLE", "Flexível"),
    EXTRAORDINARY("EXTRAORDINARY", "Extraordinário");

    companion object {
        fun from(value: String): SpendingType = entries.firstOrNull { it.stored == value } ?: FLEXIBLE
    }
}

data class BudgetItem(
    val id: String,
    val name: String,
    val actualCents: Long,
    val plannedCents: Long,
    val baselineCents: Long,
    val type: SpendingType,
    val included: Boolean = true,
    val rolloverEnabled: Boolean = false
)

data class BudgetMetrics(
    val actualCents: Long,
    val limitCents: Long,
    val remainingCents: Long,
    val overCents: Long,
    val daysRemaining: Int,
    val dailyAllowanceCents: Long?,
    val baselineCents: Long,
    val differenceFromBaselineCents: Long,
    val fixedCents: Long,
    val flexibleCents: Long,
    val extraordinaryCents: Long,
    val forecastCents: Long,
    val forecastVsLimitCents: Long
)

data class UnusualSpend(val expenseId: String, val name: String, val aboveRecentCents: Long)

object BudgetMath {
    fun withWhatIf(items: List<BudgetItem>, amountCents: Long, expenseId: String? = null): List<BudgetItem> {
        require(amountCents >= 0)
        if (expenseId == null) return items + BudgetItem("what-if", "Simulação", amountCents,
            0, 0, SpendingType.EXTRAORDINARY)
        return items.map { if (it.id == expenseId) it.copy(actualCents = it.actualCents + amountCents) else it }
    }

    fun metrics(month: YearMonth, today: LocalDate, items: List<BudgetItem>, limitCents: Long): BudgetMetrics {
        val active = items.filter { it.included }
        val actual = active.sumOf { it.actualCents }
        val remaining = (limitCents - actual).coerceAtLeast(0)
        val over = (actual - limitCents).coerceAtLeast(0)
        val daysRemaining = when {
            month < YearMonth.from(today) -> 0
            month > YearMonth.from(today) -> month.lengthOfMonth()
            else -> month.lengthOfMonth() - today.dayOfMonth + 1
        }
        val daily = if (limitCents > 0 && over == 0L && daysRemaining > 0) remaining / daysRemaining else null
        val baseline = active.filter { it.type != SpendingType.EXTRAORDINARY }.sumOf { it.baselineCents }
        val fixed = active.filter { it.type == SpendingType.FIXED }.sumOf { it.actualCents }
        val flexible = active.filter { it.type == SpendingType.FLEXIBLE }.sumOf { it.actualCents }
        val extraordinary = active.filter { it.type == SpendingType.EXTRAORDINARY }.sumOf { it.actualCents }
        val elapsed = when {
            month < YearMonth.from(today) -> month.lengthOfMonth()
            month > YearMonth.from(today) -> 0
            else -> today.dayOfMonth
        }
        val fixedForecast = active.filter { it.type == SpendingType.FIXED }
            .sumOf { maxOf(it.actualCents, it.plannedCents) }
        val flexibleForecast = if (elapsed <= 0) active.filter { it.type == SpendingType.FLEXIBLE }.sumOf { it.plannedCents }
            else maxOf(flexible, (flexible.toDouble() / elapsed * month.lengthOfMonth()).roundToLong())
        val forecast = maxOf(actual, fixedForecast + flexibleForecast + extraordinary)
        return BudgetMetrics(actual, limitCents, remaining, over, daysRemaining, daily,
            baseline, actual - baseline, fixed, flexible, extraordinary, forecast, forecast - limitCents)
    }

    fun rolloverCents(previous: List<BudgetItem>): Long = previous.filter {
        it.included && it.type == SpendingType.FLEXIBLE && it.rolloverEnabled
    }.sumOf { (it.plannedCents - it.actualCents).coerceAtLeast(0) }

    fun savingsGoalPossible(knownIncomeCents: Long?, actualCents: Long, goalCents: Long): Boolean? {
        if (knownIncomeCents == null || knownIncomeCents <= 0L || goalCents <= 0L) return null
        return knownIncomeCents - actualCents >= goalCents
    }

    fun splitIsValid(totalCents: Long, parts: List<Long>): Boolean =
        totalCents >= 0 && parts.isNotEmpty() && parts.all { it >= 0 } && parts.sum() == totalCents

    fun recurringExpenseIds(history: List<ExpenseMonth>, through: YearMonth): Set<String> {
        val priorKey = through.minusMonths(1).key()
        val twoBackKey = through.minusMonths(2).key()
        return history.filter { it.included && it.paidCents > 0 && (it.monthKey == priorKey || it.monthKey == twoBackKey) }
            .groupBy { it.expenseId }
            .filterValues { months -> months.map { it.monthKey }.toSet().containsAll(listOf(twoBackKey, priorKey)) }
            .keys
    }

    fun unusual(items: List<BudgetItem>, history: List<ExpenseMonth>, month: YearMonth): List<UnusualSpend> {
        return items.mapNotNull { item ->
            if (!item.included || item.actualCents <= 0) return@mapNotNull null
            val previous = history.filter { it.expenseId == item.id && it.monthKey < month.key() && it.paidCents > 0 }
                .sortedByDescending { it.monthKey }.take(3)
            if (previous.size < 2) return@mapNotNull null
            val average = previous.sumOf { it.paidCents } / previous.size
            val delta = item.actualCents - average
            if (delta >= 10_000 && item.actualCents >= average * 3 / 2)
                UnusualSpend(item.id, item.name, delta) else null
        }.sortedByDescending { it.aboveRecentCents }
    }
}

fun ExpenseRow.toBudgetItem() = BudgetItem(
    id = expense.id,
    name = expense.category.ifBlank { expense.name },
    actualCents = payment.paidCents,
    plannedCents = payment.expectedCents,
    baselineCents = payment.baselineCents,
    type = SpendingType.from(payment.spendingType),
    included = payment.included,
    rolloverEnabled = expense.rolloverEnabled
)
