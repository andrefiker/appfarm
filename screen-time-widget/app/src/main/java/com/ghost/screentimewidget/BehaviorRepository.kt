package com.ghost.screentimewidget

import java.time.*

data class BehaviorSnapshot(
    val today: DayProgress, val days: List<DayProgress>, val last: AwayBreak?, val lastDaytime: Long,
    val overnight: Long, val steps: List<Milestone>, val awards: List<Milestone>, val challenge: DailyChallenge,
    val challengeComplete: Boolean, val comparison: Comparison, val message: String?, val baseline: Long?,
    val historyDays: Int, val warning: String?, val opens: Map<String,Int>
)
fun buildBehavior(events: List<TimedEvent>, now: Long, settings: AppSettings, journal: LocalHistory, naturalReturn: Boolean): BehaviorSnapshot {
    val zone = ZoneId.systemDefault()
    val date = Instant.ofEpochMilli(now).atZone(zone).toLocalDate()
    val behavior = deriveBehavior(events,now,settings.exclusions + "com.android.systemui")
    val tracking = journal.number("trackingSince")
    val unlockSupported = events.any { it.kind == EventKind.RETURN }
    fun day(d: LocalDate, until: Long? = null, threshold: Long = 10*MINUTE): DayProgress {
        val start = d.atStartOfDay(zone).toInstant().toEpochMilli()
        val end = minOf(until ?: now,d.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli())
        val breaks = behavior.breaks.filter { it.end >= start && it.end < d.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli() && it.end <= end }
        val amounts = breaks.filter(::eligible).map { breakMillis(it,settings.sleep,zone) }.filter { it > 0 }
        val available = events.any { it.time >= start && it.time <= end && it.kind in listOf(EventKind.SCREEN_ON,EventKind.SCREEN_OFF) }
        val unlocks = if(unlockSupported && available) behavior.returns.count { it >= start && it <= end && it < d.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli() } else null
        return DayProgress(d,start,end,deriveUsage(events.filter {it.time>=start-2*DAY && it.time<=end},start,end).screenMillis,unlocks,breaks,amounts.maxOrNull() ?: 0,
            if(amounts.isEmpty()) 0 else amounts.average().toLong(),amounts.count { it >= threshold },available && tracking in 1..start && end >= d.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli(),threshold,available)
    }
    val past = (7 downTo 1).map { day(date.minusDays(it.toLong())) }
    val baseline = baselineBreak(past,settings.sleep,zone)
    val proposed = milestones(baseline)
    if(journal.challenge(date.toString()) == null) {
        var challenge = makeChallenge(date,proposed,past)
        if(challenge.kind == ChallengeKind.BEFORE_LUNCH && Instant.ofEpochMilli(now).atZone(zone).hour >= 12) challenge = challenge.copy(kind=ChallengeKind.ONE)
        journal.saveChallenge(challenge)
    }
    val saved = journal.challenge(date.toString())!!
    val challenge = saved.first
    val steps = listOf(challenge.minutes,challenge.minutes*2,challenge.minutes*3,challenge.minutes*6,challenge.minutes*9).map { it.coerceAtMost(360) }.distinct().mapIndexed { i,n -> Milestone(n,listOf("First Step","Finding Space","Half-Hour Hero","The Outside World","Unplugged")[i]) }
    val today = day(date,threshold=steps.first().minutes*MINUTE)
    val qualifying = today.breaks.filter { eligible(it) && it.end >= tracking }
    for(b in qualifying) for(step in steps) if(breakMillis(b,settings.sleep,zone) >= step.minutes*MINUTE) journal.award(date.toString(),step,b)
    val completed = saved.second || challengeDone(challenge,qualifying,settings.sleep,zone)
    if(completed && !saved.second) journal.complete(date.toString())
    val sameWeekday = (1..28).map { date.minusDays(it.toLong()) }.filter { it.dayOfWeek == date.dayOfWeek }.map { day(it) }.filter { it.full }
    val comparisonDays = if(sameWeekday.size >= 3) sameWeekday else past.filter { it.full }
    val time = Instant.ofEpochMilli(now).atZone(zone).toLocalTime()
    val periods = comparisonDays.map { d -> day(d.date,minOf(d.date.atTime(time).atZone(zone).toInstant().toEpochMilli(),d.end)) }.map { it.screenMillis to it.unlocks }
    val comparison = comparePeriods(today.screenMillis,today.unlocks,periods,if(sameWeekday.size >= 3) "vs usual ${date.dayOfWeek.name.lowercase().replaceFirstChar { it.uppercase() }} by this time" else "vs recent days by this time")
    val last = today.breaks.lastOrNull()
    val daytime = last?.let { breakMillis(it,settings.sleep,zone) } ?: 0
    val sleepTime = last?.let { it.rawMillis-daytime } ?: 0
    val feedbackDay = journal.get("feedbackDay")
    val count = if(feedbackDay == date.toString()) journal.number("feedbackCount").toInt() else 0
    if(naturalReturn && last != null && daytime >= steps.first().minutes*MINUTE && shouldCelebrate(last,now,steps.first().minutes*MINUTE,journal.number("feedbackAt"),count,journal.get("feedbackId") ?: "")) {
        val seq = journal.number("messageSequence")
        journal.put("feedbackText",reinforcementMessage(seq,daytime/MINUTE))
        journal.put("messageSequence",seq+1)
        journal.put("feedbackAt",last.end); journal.put("feedbackId",last.id); journal.put("feedbackDay",date); journal.put("feedbackCount",count+1)
    }
    val feedback = if(journal.get("feedbackDay") == date.toString() && now-journal.number("feedbackAt") in 0..4*60*MINUTE) journal.get("feedbackText") else null
    val warning = when {
        journal.number("clockWarning") >= today.start -> "Clock, reboot or permission boundary: uncertain intervals were discarded."
        tracking > today.start -> "Today is partial; full-day baselines start tomorrow."
        else -> null
    }
    journal.prune(date.minusDays(35).toString())
    val todayEvents = events.filter { it.time >= today.start }
    return BehaviorSnapshot(today,past,last,daytime,sleepTime,steps,journal.awards(date.toString()),challenge,completed,comparison,feedback,baseline,past.count { it.full },warning,deriveBehavior(todayEvents,now,settings.exclusions).opens)
}
