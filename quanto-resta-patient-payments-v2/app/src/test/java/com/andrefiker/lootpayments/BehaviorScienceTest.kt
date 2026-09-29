package com.andrefiker.lootpayments

import org.junit.Assert.*
import org.junit.Test
import java.time.LocalDate
import java.time.ZoneId
import java.time.YearMonth

class BehaviorScienceTest {
    @Test fun rulesAreTransparentAndThresholdBased() {
        val rule = PersonalRule("r", "Esperar 48h", 30000, "Compras", 48)
        assertEquals(rule, BehaviorScience.matchingRule(listOf(rule), 65000, "Compras"))
        assertNull(BehaviorScience.matchingRule(listOf(rule), 30000, "Compras"))
        assertNull(BehaviorScience.matchingRule(listOf(rule), 65000, "Saúde"))
    }

    @Test fun coolingNeverBecomesActualByItself() {
        val item = CoolingPurchase("c", "Projetor", "Compras", 60000, 1000, 2000, ruleId = "r")
        assertFalse(BehaviorScience.coolingReady(item, 1999))
        assertTrue(BehaviorScience.coolingReady(item, 2000))
        assertEquals("WAITING", item.status)
    }

    @Test fun effectivenessCountsObservedEventsWithoutCausalClaims() {
        val rule = PersonalRule("r", "Esperar", 30000, "", 48)
        val events = listOf(StrategyEvent("1", "r", "c1", "WAITED", 50000),
            StrategyEvent("2", "r", "c1", "DISCARDED", 50000),
            StrategyEvent("3", "r", "c2", "WAITED", 68000))
        assertEquals(StrategyStats(2, 1, 50000), BehaviorScience.strategyStats(rule, events))
    }

    @Test fun monthProgressAndVelocityUseOnlyRecordedTransactions() {
        val month = YearMonth.of(2026, 9)
        val today = LocalDate.of(2026, 9, 15)
        assertEquals(MonthProgress(50, 40), BehaviorScience.monthProgress(month, today, 20000, 50000))
        val zone = ZoneId.of("UTC")
        val tx = listOf(ActualTransaction("a", null, month.key(),
            today.minusDays(1).atStartOfDay(zone).toInstant().toEpochMilli(), 7000, "A", "Compras"),
            ActualTransaction("b", null, month.key(), today.atStartOfDay(zone).toInstant().toEpochMilli(),
                7000, "B", "Compras"))
        val velocity = BehaviorScience.velocity(tx, month, today, zone)
        assertEquals(2000L, velocity.lastSevenDaysPerDayCents)
        assertEquals(933L, velocity.monthPerDayCents)
    }
}
