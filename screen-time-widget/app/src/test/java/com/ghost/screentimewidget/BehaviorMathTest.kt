package com.ghost.screentimewidget

import org.junit.Assert.*
import org.junit.Test
import java.time.*

class BehaviorMathTest {
    private val zone=ZoneId.of("UTC")
    private val date=LocalDate.of(2026,10,9)
    private fun at(h: Int,m: Int=0,d: LocalDate=date)=d.atTime(h,m).atZone(zone).toInstant().toEpochMilli()
    private fun e(h: Int,m: Int,k: EventKind,p: String="")=TimedEvent(at(h,m),k,p)
    private fun progress(d: LocalDate, full: Boolean=true, durations: List<Long> = listOf(8*MINUTE,8*MINUTE)) = DayProgress(d,at(0,d=d),at(0,d=d.plusDays(1)),120*MINUTE,20,durations.mapIndexed { i,v -> AwayBreak(at(8,d=d)+i*60*MINUTE,at(8,d=d)+i*60*MINUTE+v,true) },durations.maxOrNull() ?: 0,durations.average().toLong(),0,full,10*MINUTE)
    @Test fun shortBreakMeasured() {val r=deriveBehavior(listOf(e(8,0,EventKind.SCREEN_OFF),e(8,2,EventKind.RETURN)),at(9)); assertEquals(2*MINUTE,r.breaks.single().rawMillis)}
    @Test fun longBreakMeasured() {val r=deriveBehavior(listOf(e(8,0,EventKind.SCREEN_OFF),e(11,0,EventKind.RETURN)),at(12)); assertEquals(180*MINUTE,r.breaks.single().rawMillis)}
    @Test fun screenWakeDoesNotAward() {val r=deriveBehavior(listOf(e(8,0,EventKind.SCREEN_OFF),e(8,30,EventKind.SCREEN_ON)),at(9)); assertTrue(r.breaks.isEmpty()); assertEquals(at(8),r.pendingSince)}
    @Test fun lockCountsAsAwayBoundary() {val r=deriveBehavior(listOf(e(8,0,EventKind.LOCK),e(9,0,EventKind.RETURN)),at(10)); assertTrue(r.breaks.single().locked)}
    @Test fun duplicateUnlocksCountOnce() {val r=deriveBehavior(listOf(e(8,0,EventKind.SCREEN_OFF),e(9,0,EventKind.RETURN),e(9,0,EventKind.RETURN),e(9,1,EventKind.RETURN)),at(10)); assertEquals(1,r.returns.size); assertEquals(1,r.breaks.size)}
    @Test fun consecutiveSessionsCountSeparately() {val r=deriveBehavior(listOf(e(8,0,EventKind.SCREEN_OFF),e(8,20,EventKind.RETURN),e(8,21,EventKind.SCREEN_OFF),e(8,40,EventKind.RETURN)),at(10)); assertEquals(2,r.breaks.size);assertEquals(2,r.returns.size)}
    @Test fun unorderedEventsStable() {val events=listOf(e(8,0,EventKind.SCREEN_OFF),e(9,0,EventKind.RETURN));assertEquals(deriveBehavior(events,at(10)),deriveBehavior(events.reversed(),at(10)))}
    @Test fun futureEventsIgnored() {assertTrue(deriveBehavior(listOf(e(8,0,EventKind.SCREEN_OFF),e(10,0,EventKind.RETURN)),at(9)).breaks.isEmpty())}
    @Test fun missingStartDoesNotInventBreak() {assertTrue(deriveBehavior(listOf(e(9,0,EventKind.RETURN)),at(10)).breaks.isEmpty())}
    @Test fun missingEndKeepsPending() {assertEquals(at(8),deriveBehavior(listOf(e(8,0,EventKind.SCREEN_OFF)),at(10)).pendingSince)}
    @Test fun rebootDropsOpenBreak() {val r=deriveBehavior(listOf(e(8,0,EventKind.SCREEN_OFF),e(9,0,EventKind.RESET),e(10,0,EventKind.RETURN)),at(11));assertTrue(r.breaks.isEmpty())}
    @Test fun newSessionAfterRebootWorks() {val r=deriveBehavior(listOf(e(8,0,EventKind.SCREEN_OFF),e(9,0,EventKind.RESET),e(10,0,EventKind.SCREEN_OFF),e(11,0,EventKind.RETURN)),at(12));assertEquals(60*MINUTE,r.breaks.single().rawMillis)}
    @Test fun overnightEntirelyExcluded() {assertEquals(0,daytimeMillis(at(23),at(7,d=date.plusDays(1)),SleepWindow(),zone))}
    @Test fun overlappingSleepSubtractsOnlyOverlap() {assertEquals(120*MINUTE,daytimeMillis(at(22),at(8,d=date.plusDays(1)),SleepWindow(),zone))}
    @Test fun midnightSpan() {assertEquals(30*MINUTE,daytimeMillis(at(22,30),at(1,d=date.plusDays(1)),SleepWindow(),zone))}
    @Test fun daytimeSleepWindow() {assertEquals(60*MINUTE,daytimeMillis(at(12),at(15),SleepWindow(13*60,15*60),zone))}
    @Test fun equalSleepEndpointsDisable() {assertEquals(8*60*MINUTE,daytimeMillis(at(23),at(7,d=date.plusDays(1)),SleepWindow(0,0),zone))}
    @Test fun multipleSleepWindows() {assertEquals(32*60*MINUTE,daytimeMillis(at(7),at(7,d=date.plusDays(2)),SleepWindow(),zone))}
    @Test fun dstSpringSleepUsesActualEpochs() {val z=ZoneId.of("America/New_York"); val s=LocalDate.of(2026,3,7).atTime(23,0).atZone(z).toInstant().toEpochMilli();val n=LocalDate.of(2026,3,8).atTime(7,0).atZone(z).toInstant().toEpochMilli();assertEquals(0,daytimeMillis(s,n,SleepWindow(),z));assertEquals(7*60*MINUTE,n-s)}
    @Test fun zeroNegativeDuration() {assertEquals(0,daytimeMillis(at(9),at(8),SleepWindow(),zone))}
    @Test fun firstMilestones() {assertEquals(listOf(10,20,30,60,90),milestones(null).map {it.minutes})}
    @Test fun shortBaselineShapesAchievable() {assertEquals(10,milestones(8*MINUTE).first().minutes)}
    @Test fun establishedBaselineIncreases() {assertEquals(75,milestones(60*MINUTE).first().minutes)}
    @Test fun baselineRequiresThreeFullDays() {assertNull(baselineBreak(listOf(progress(date),progress(date.minusDays(1))),SleepWindow(),zone))}
    @Test fun partialDaysExcluded() {assertNull(baselineBreak(listOf(progress(date),progress(date.minusDays(1)),progress(date.minusDays(2),false)),SleepWindow(),zone))}
    @Test fun sixBreaksFormBaseline() {assertEquals(8*MINUTE,baselineBreak((1..3).map {progress(date.minusDays(it.toLong()))},SleepWindow(),zone))}
    @Test fun emptyBaselineUnavailable() {assertNull(baselineBreak(emptyList(),SleepWindow(),zone))}
    @Test fun fallbackForegroundEstimated() {val r=deriveBehavior(listOf(e(8,0,EventKind.SCREEN_OFF),e(9,0,EventKind.SCREEN_ON),e(9,1,EventKind.RESUME,"test.app")),at(10)); assertFalse(r.breaks.single().confirmed);assertTrue(r.returns.isEmpty())}
    @Test fun knownLockCannotCloseWithForeground() {val r=deriveBehavior(listOf(e(8,0,EventKind.LOCK),e(8,0,EventKind.SCREEN_OFF),e(9,0,EventKind.SCREEN_ON),e(9,1,EventKind.RESUME,"test.app")),at(10));assertTrue(r.breaks.isEmpty())}
    @Test fun lateUnlockConfirmsEstimate() {val r=deriveBehavior(listOf(TimedEvent(at(8),EventKind.SCREEN_OFF),TimedEvent(at(9),EventKind.SCREEN_ON),TimedEvent(at(9)+100,EventKind.RESUME,"app"),TimedEvent(at(9)+500,EventKind.RETURN)),at(10));assertTrue(r.breaks.single().confirmed);assertEquals(1,r.returns.size)}
    @Test fun estimatedBreakNotEligible() {assertFalse(eligible(AwayBreak(at(8),at(9),false)))}
    @Test fun multiDayAmbiguityNotEligible() {assertFalse(eligible(AwayBreak(0,37*60*MINUTE,true)))}
    @Test fun challengeCompleteOne() {assertTrue(challengeDone(DailyChallenge(date.toString(),20,1,ChallengeKind.ONE),listOf(AwayBreak(at(8),at(8,20),true)),SleepWindow(),zone))}
    @Test fun challengeIncompleteExpiresWithoutPenalty() {assertFalse(challengeDone(DailyChallenge(date.toString(),20,1,ChallengeKind.ONE),emptyList(),SleepWindow(),zone))}
    @Test fun challengeNoOvernightAward() {assertFalse(challengeDone(DailyChallenge(date.plusDays(1).toString(),10,1,ChallengeKind.ONE),listOf(AwayBreak(at(23),at(7,d=date.plusDays(1)),true)),SleepWindow(),zone))}
    @Test fun beforeLunchExcludesAfternoon() {assertFalse(challengeDone(DailyChallenge(date.toString(),10,1,ChallengeKind.BEFORE_LUNCH),listOf(AwayBreak(at(14),at(15),true)),SleepWindow(),zone))}
    @Test fun challengeThreeRequiresThree() {val c=DailyChallenge(date.toString(),10,3,ChallengeKind.THREE);val bs=(8..10).map {AwayBreak(at(it),at(it,10),true)};assertTrue(challengeDone(c,bs,SleepWindow(),zone));assertFalse(challengeDone(c,bs.take(2),SleepWindow(),zone))}
    @Test fun comparisonInsufficientUnavailable() {val c=comparePeriods(10,2,listOf(100L to 10),"same time");assertNull(c.screenPercent);assertNull(c.fewerUnlocks)}
    @Test fun comparisonUsesSuppliedEquivalentPeriods() {val c=comparePeriods(78,12,List(3){100L to 20},"same time");assertEquals(22,c.screenPercent);assertEquals(8,c.fewerUnlocks)}
    @Test fun missingUnlockComparisonUnavailable() {val c=comparePeriods(78,null,List(3){100L to null},"same time");assertNull(c.fewerUnlocks)}
    @Test fun noDivideByZero() {assertNull(comparePeriods(0,0,List(3){0L to 0},"same time").screenPercent)}
    @Test fun celebrationFreshBreakOnly() {val b=AwayBreak(at(8),at(9),true);assertTrue(shouldCelebrate(b,at(9)+1000,10*MINUTE,0,0,""));assertFalse(shouldCelebrate(b,at(10),10*MINUTE,0,0,""))}
    @Test fun noDuplicateCelebration() {val b=AwayBreak(at(8),at(9),true);assertFalse(shouldCelebrate(b,at(9),10*MINUTE,0,0,b.id))}
    @Test fun celebrationRateLimited() {val b=AwayBreak(at(8),at(9),true);assertFalse(shouldCelebrate(b,at(9),10*MINUTE,at(8),1,"old"));assertFalse(shouldCelebrate(b,at(9),10*MINUTE,0,3,"old"))}
    @Test fun sixtyDistinctMessagesMinimum() {assertTrue(awayMessages.distinct().size>=60)}
    @Test fun messagesStableUntilSequenceAdvances() {assertEquals(reinforcementMessage(2,40),reinforcementMessage(2,40));assertNotEquals(reinforcementMessage(2,40),reinforcementMessage(3,40))}
    @Test fun reconciliationAvoidsBroadcastDuplicate() {val n=TimedEvent(1000,EventKind.RETURN,"android");assertEquals(listOf(n),reconcileEvents(emptyList(),listOf(n),listOf(TimedEvent(1200,EventKind.RETURN))))}
    @Test fun historicalReparseHasStableIds() {val es=listOf(e(8,0,EventKind.SCREEN_OFF),e(9,0,EventKind.RETURN));assertEquals(deriveBehavior(es,at(10)).breaks.map {it.id},deriveBehavior(es+es,at(10)).breaks.map {it.id})}
    @Test fun clockForwardJumpDetected() { assertTrue(clockJump(1000000,1000,1,1400000,2000,1)) }
    @Test fun clockBackwardJumpDetected() { assertTrue(clockJump(1000000,1000,1,600000,2000,1)) }
    @Test fun normalMonotonicProgressAccepted() { assertFalse(clockJump(1000000,1000,1,1300000,301000,1)) }
    @Test fun rebootIsNotClockJump() { assertFalse(clockJump(1000000,1000,1,1400000,2000,2)) }
    @Test fun noHistoryIsNotClockJump() { assertFalse(clockJump(0,0,null,1400000,2000,1)) }
}
