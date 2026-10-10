package com.ghost.screentimewidget
import org.junit.Assert.*
import org.junit.Test

class IntervalMathTest {
    private fun e(t: Long, k: EventKind, p: String = "", a: String = "") = TimedEvent(t,k,p,a)
    @Test fun screenIntervalsAndOpenTail() {
        val r = deriveUsage(listOf(e(10,EventKind.SCREEN_ON),e(30,EventKind.SCREEN_OFF),e(50,EventKind.SCREEN_ON)),0,100)
        assertEquals(70L,r.screenMillis); assertTrue(r.screenOn)
    }
    @Test fun spansMidnight() {
        val r=deriveUsage(listOf(e(-100,EventKind.SCREEN_ON),e(-50,EventKind.RESUME,"a"),e(40,EventKind.PAUSE,"a"),e(80,EventKind.SCREEN_OFF)),0,100)
        assertEquals(80L,r.screenMillis); assertEquals(40L,r.packages["a"])
    }
    @Test fun duplicatesAndUnsorted() {
        val xs=listOf(e(70,EventKind.SCREEN_OFF),e(10,EventKind.SCREEN_ON),e(10,EventKind.SCREEN_ON),e(20,EventKind.RESUME,"a"),e(20,EventKind.RESUME,"a"))
        val r=deriveUsage(xs,0,100); assertEquals(60L,r.screenMillis); assertEquals(50L,r.packages["a"])
    }
    @Test fun overlappingActivitiesUseUnion() {
        val r=deriveUsage(listOf(e(0,EventKind.SCREEN_ON),e(10,EventKind.RESUME,"a","A"),e(20,EventKind.RESUME,"a","B"),e(30,EventKind.PAUSE,"a","A"),e(50,EventKind.PAUSE,"a","B")),0,100)
        assertEquals(40L,r.packages["a"])
    }
    @Test fun overlappingPackagesAreIndependent() {
        val r=deriveUsage(listOf(e(0,EventKind.SCREEN_ON),e(10,EventKind.RESUME,"a"),e(20,EventKind.RESUME,"b"),e(40,EventKind.PAUSE,"a"),e(60,EventKind.PAUSE,"b")),0,100)
        assertEquals(mapOf("a" to 30L,"b" to 40L),r.packages)
    }
    @Test fun unmatchedPauseDoesNotInventUsage() { assertTrue(deriveUsage(listOf(e(10,EventKind.PAUSE,"a")),0,100).packages.isEmpty()) }
    @Test fun openForegroundClampedAtNow() { assertEquals(75L,deriveUsage(listOf(e(25,EventKind.RESUME,"a")),0,100).packages["a"]) }
    @Test fun offClosesMissingPause() { assertEquals(30L,deriveUsage(listOf(e(0,EventKind.SCREEN_ON),e(10,EventKind.RESUME,"a"),e(40,EventKind.SCREEN_OFF)),0,100).packages["a"]) }
    @Test fun rebootClosesAllIntervals() { val r=deriveUsage(listOf(e(0,EventKind.SCREEN_ON),e(5,EventKind.RESUME,"a"),e(20,EventKind.RESET)),0,100); assertEquals(20L,r.screenMillis); assertEquals(15L,r.packages["a"]); assertFalse(r.screenOn) }
    @Test fun futureEventsIgnored() { assertEquals(90L,deriveUsage(listOf(e(10,EventKind.SCREEN_ON),e(110,EventKind.SCREEN_OFF)),0,100).screenMillis) }
    @Test fun repeatedPauseIsHarmless() { assertEquals(10L,deriveUsage(listOf(e(10,EventKind.RESUME,"a"),e(20,EventKind.PAUSE,"a"),e(30,EventKind.PAUSE,"a")),0,100).packages["a"]) }
    @Test fun blankPauseClosesKnownClass() { assertEquals(10L,deriveUsage(listOf(e(10,EventKind.RESUME,"a","A"),e(20,EventKind.PAUSE,"a")),0,100).packages["a"]) }
    @Test fun allBeforeMidnightContributeZero() { assertEquals(0L,deriveUsage(listOf(e(-20,EventKind.SCREEN_ON),e(-10,EventKind.SCREEN_OFF)),0,100).screenMillis) }
    @Test fun durationFormattingNeverWraps() { assertEquals("25:00:00",clockLabel(90000000)); assertEquals("1h 12m",durationLabel(4320000)) }
}
