package com.andrefiker.away

import org.junit.Assert.*
import org.junit.Test

class IntervalCalculatorTest {
    @Test fun calculatesOffToUnlock() {
        val breaks = IntervalCalculator.completed(listOf(
            ScreenEvent(1_000, ScreenEvent.Kind.OFF), ScreenEvent(3_661_000, ScreenEvent.Kind.UNLOCK)
        ))
        assertEquals(1, breaks.size)
        assertEquals(3_660_000L, breaks.single().durationMs)
    }

    @Test fun duplicateAndUnmatchedEventsDoNotInventBreaks() {
        val events = listOf(
            ScreenEvent(100, ScreenEvent.Kind.OFF), ScreenEvent(100, ScreenEvent.Kind.OFF),
            ScreenEvent(200, ScreenEvent.Kind.UNLOCK), ScreenEvent(300, ScreenEvent.Kind.UNLOCK)
        )
        assertEquals(1, IntervalCalculator.completed(UsageHistory.deduplicate(events)).size)
    }

    @Test fun screenWakeAndRebootInvalidateCandidate() {
        val events = listOf(
            ScreenEvent(1, ScreenEvent.Kind.OFF), ScreenEvent(2, ScreenEvent.Kind.INTERACTIVE),
            ScreenEvent(3, ScreenEvent.Kind.UNLOCK), ScreenEvent(4, ScreenEvent.Kind.OFF),
            ScreenEvent(5, ScreenEvent.Kind.REBOOT), ScreenEvent(6, ScreenEvent.Kind.UNLOCK)
        )
        assertTrue(IntervalCalculator.completed(events).isEmpty())
    }

    @Test fun thresholdAndOngoingState() {
        val events = listOf(ScreenEvent(100, ScreenEvent.Kind.OFF), ScreenEvent(500, ScreenEvent.Kind.UNLOCK))
        assertTrue(IntervalCalculator.completed(events, minimumMs = 500).isEmpty())
        assertEquals(100L, IntervalCalculator.ongoingStart(listOf(ScreenEvent(100, ScreenEvent.Kind.OFF)), false))
        assertNull(IntervalCalculator.ongoingStart(listOf(ScreenEvent(100, ScreenEvent.Kind.OFF)), true))
    }

    @Test fun localMidnightIsCalendarBasedIncludingDst() {
        val tz = java.util.TimeZone.getTimeZone("America/Sao_Paulo")
        val atMidnight = java.util.Calendar.getInstance(tz).apply {
            clear(); set(2026, java.util.Calendar.OCTOBER, 9, 0, 0, 0)
        }.timeInMillis
        val now = atMidnight + 1_234
        val start = UsageHistory.localDayStart(now, tz)
        val calendar = java.util.Calendar.getInstance(tz).apply { timeInMillis = start }
        assertEquals(0, calendar.get(java.util.Calendar.HOUR_OF_DAY))
        assertEquals(0, calendar.get(java.util.Calendar.MINUTE))
        assertEquals(java.util.Calendar.OCTOBER, calendar.get(java.util.Calendar.MONTH))
        assertEquals(9, calendar.get(java.util.Calendar.DAY_OF_MONTH))
        assertEquals(atMidnight, start)
        val yesterday = java.util.Calendar.getInstance(tz).apply { timeInMillis = start - 1 }
        assertEquals(8, yesterday.get(java.util.Calendar.DAY_OF_MONTH))
        assertTrue(start <= now)
        assertTrue(now - start < 24L * 60 * 60 * 1000)
    }

    @Test fun permissionGateIsExplicit() {
        assertTrue(UsageHistory.needsAccess(false))
        assertFalse(UsageHistory.needsAccess(true))
    }
}
