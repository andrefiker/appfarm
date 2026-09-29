package com.andrefiker.lootpayments

import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId

data class SpendingVelocity(val lastSevenDaysPerDayCents: Long?, val monthPerDayCents: Long?)
data class MonthProgress(val elapsedPercent: Int, val limitUsedPercent: Int)
data class StrategyStats(val uses: Int, val declined: Int, val notSpentCents: Long)

object BehaviorScience {
    fun matchingRule(rules: List<PersonalRule>, amountCents: Long, category: String): PersonalRule? =
        rules.filter { it.enabled && amountCents > it.thresholdCents &&
            (it.category.isBlank() || it.category.equals(category, ignoreCase = true)) }
            .maxByOrNull { it.thresholdCents }

    fun coolingReady(purchase: CoolingPurchase, now: Long): Boolean =
        purchase.status == "WAITING" && now >= purchase.readyAt

    fun strategyStats(rule: PersonalRule, events: List<StrategyEvent>): StrategyStats {
        val relevant = events.filter { it.ruleId == rule.id }
        val declined = relevant.filter { it.action == "DISCARDED" }
        return StrategyStats(relevant.count { it.action == "WAITED" }, declined.size,
            declined.sumOf { it.amountCents })
    }

    fun monthProgress(month: YearMonth, today: LocalDate, actualCents: Long, limitCents: Long): MonthProgress {
        val elapsed = when {
            month < YearMonth.from(today) -> 100
            month > YearMonth.from(today) -> 0
            else -> today.dayOfMonth * 100 / month.lengthOfMonth()
        }
        val spent = if (limitCents > 0) (actualCents * 100 / limitCents).toInt() else 0
        return MonthProgress(elapsed, spent)
    }

    fun velocity(transactions: List<ActualTransaction>, month: YearMonth, today: LocalDate,
        zone: ZoneId = ZoneId.systemDefault()): SpendingVelocity {
        val active = transactions.filter { it.monthKey == month.key() &&
            !Instant.ofEpochMilli(it.occurredAt).atZone(zone).toLocalDate().isAfter(today) }
        if (active.isEmpty()) return SpendingVelocity(null, null)
        val monthDays = if (month == YearMonth.from(today)) today.dayOfMonth.coerceAtLeast(1) else month.lengthOfMonth()
        val lastStart = today.minusDays(6)
        val recent = active.filter {
            val date = Instant.ofEpochMilli(it.occurredAt).atZone(zone).toLocalDate()
            !date.isBefore(lastStart) && !date.isAfter(today)
        }
        return SpendingVelocity(if (recent.size >= 2) recent.sumOf { it.amountCents } / 7 else null,
            active.sumOf { it.amountCents } / monthDays)
    }
}
