package com.ghost.screentimewidget

import java.time.*
import kotlin.math.roundToInt

const val MINUTE = 60000L
const val DAY = 24 * 60 * MINUTE
data class SleepWindow(val startMinute: Int = 23 * 60, val endMinute: Int = 7 * 60)
data class AwayBreak(val start: Long, val end: Long, val confirmed: Boolean, val locked: Boolean = false) {
    val id get() = "$start:$end"
    val rawMillis get() = (end - start).coerceAtLeast(0)
}
data class BehaviorEvents(val breaks: List<AwayBreak>, val returns: List<Long>, val opens: Map<String,Int>, val pendingSince: Long?)

/** Screen wake alone isn't a meaningful return. Lock-hidden confirms it; foreground is labeled estimated. */
fun deriveBehavior(events: List<TimedEvent>, now: Long, excluded: Set<String> = emptySet()): BehaviorEvents {
    var pending: Long? = null
    var locked = false
    var canReturn = true
    var screenOn = false
    val breaks = mutableListOf<AwayBreak>()
    val returns = mutableListOf<Long>()
    val opens = mutableMapOf<String,Int>()
    val foreground = mutableSetOf<String>()
    fun close(t: Long, confirmed: Boolean) {
        pending?.let { if(t > it) breaks.add(AwayBreak(it,t,confirmed,locked)) }
        pending = null
    }
    for(e in events.distinct().filter { it.time <= now }.sortedWith(compareBy<TimedEvent> { it.time }.thenBy { when(it.kind) { EventKind.SCREEN_ON -> 0; EventKind.LOCK -> 1; EventKind.RETURN -> 2; else -> 3 } })) {
        when(e.kind) {
            EventKind.SCREEN_OFF, EventKind.LOCK -> {
                if(pending == null) pending = e.time
                if(e.kind == EventKind.LOCK) locked = true else screenOn = false
                canReturn = true
                foreground.clear()
            }
            EventKind.SCREEN_ON -> { screenOn = true }
            EventKind.RETURN -> {
                if(canReturn) { returns.add(e.time); close(e.time,true); canReturn = false; locked = false }
                else if(breaks.lastOrNull()?.let { !it.confirmed && e.time-it.end in 0..2000 } == true) {
                    val previous = breaks.removeAt(breaks.lastIndex); breaks.add(previous.copy(end=e.time,confirmed=true)); returns.add(e.time)
                }
            }
            EventKind.RESUME -> if(e.pkg.isNotBlank() && e.pkg !in excluded) {
                if(foreground.add(e.pkg)) opens[e.pkg] = (opens[e.pkg] ?: 0) + 1
                // Never infer an unlock on a phone whose keyguard is known to be locked.
                if(screenOn && !locked && pending != null) { close(e.time,false); canReturn = false }
            }
            EventKind.PAUSE -> foreground.remove(e.pkg)
            EventKind.RESET -> { pending = null; locked = false; canReturn = true; foreground.clear(); screenOn = false }
        }
    }
    return BehaviorEvents(breaks,returns.distinct(),opens,pending)
}

fun daytimeMillis(start: Long, end: Long, sleep: SleepWindow, zone: ZoneId): Long {
    if(end <= start) return 0
    // Equal endpoints means sleep exclusion is disabled.
    if(sleep.startMinute == sleep.endMinute) return end-start
    var excluded = 0L
    var date = Instant.ofEpochMilli(start).atZone(zone).toLocalDate().minusDays(1)
    val last = Instant.ofEpochMilli(end).atZone(zone).toLocalDate()
    while(!date.isAfter(last)) {
        val from = date.atStartOfDay().plusMinutes(sleep.startMinute.toLong()).atZone(zone).toInstant().toEpochMilli()
        val untilDate = if(sleep.endMinute <= sleep.startMinute) date.plusDays(1) else date
        val until = untilDate.atStartOfDay().plusMinutes(sleep.endMinute.toLong()).atZone(zone).toInstant().toEpochMilli()
        excluded += (minOf(end,until)-maxOf(start,from)).coerceAtLeast(0)
        date = date.plusDays(1)
    }
    return (end-start-excluded).coerceAtLeast(0)
}
fun breakMillis(b: AwayBreak, sleep: SleepWindow, zone: ZoneId) = daytimeMillis(b.start,b.end,sleep,zone)
fun eligible(b: AwayBreak) = b.confirmed && b.rawMillis <= 36 * 60 * MINUTE

data class DayProgress(val date: LocalDate, val start: Long, val end: Long, val screenMillis: Long, val unlocks: Int?, val breaks: List<AwayBreak>, val longest: Long, val meanBreak: Long, val meaningful: Int, val full: Boolean, val threshold: Long, val available: Boolean = true)
data class Milestone(val minutes: Int, val title: String)
fun milestones(baseline: Long?): List<Milestone> {
    val base = baseline?.takeIf { it > 0 }?.let { (it.toDouble()/MINUTE * 1.25 / 5).roundToInt()*5 }?.coerceIn(5,240) ?: 10
    val steps = if(baseline == null) listOf(10,20,30,60,90) else listOf(base,base*2,base*3,base*6,base*9).map { it.coerceAtMost(360) }.distinct()
    val names = listOf("First Step","Finding Space","Half-Hour Hero","The Outside World","Unplugged")
    return steps.mapIndexed { i,n -> Milestone(n,names[i]) }
}
fun median(values: List<Long>): Long? = values.sorted().takeIf { it.isNotEmpty() }?.let { it[it.size/2] }
fun baselineBreak(days: List<DayProgress>, sleep: SleepWindow, zone: ZoneId): Long? {
    val valid = days.filter { it.full }
    val values = valid.flatMap { it.breaks }.filter(::eligible).map { breakMillis(it,sleep,zone) }.filter { it >= MINUTE }
    return if(valid.size >= 3 && values.size >= 6) median(values) else null
}

enum class ChallengeKind { ONE, BEFORE_LUNCH, THREE }
data class DailyChallenge(val date: String, val minutes: Int, val count: Int, val kind: ChallengeKind) {
    val text get() = when(kind) {
        ChallengeKind.ONE -> "Take one $minutes-minute daytime break."
        ChallengeKind.BEFORE_LUNCH -> "Take one $minutes-minute break before lunch."
        ChallengeKind.THREE -> "Have $count daytime breaks of $minutes minutes."
    }
}
fun makeChallenge(date: LocalDate, steps: List<Milestone>, history: List<DayProgress>): DailyChallenge {
    val first = steps.first().minutes
    val kind = when { history.count { it.full } < 3 -> ChallengeKind.ONE; date.dayOfWeek.value % 3 == 0 -> ChallengeKind.THREE; date.dayOfWeek.value % 3 == 1 -> ChallengeKind.BEFORE_LUNCH; else -> ChallengeKind.ONE }
    return DailyChallenge(date.toString(),first,if(kind == ChallengeKind.THREE) 3 else 1,kind)
}
fun challengeDone(challenge: DailyChallenge, breaks: List<AwayBreak>, sleep: SleepWindow, zone: ZoneId): Boolean {
    val date = LocalDate.parse(challenge.date)
    val noon = date.atTime(12,0).atZone(zone).toInstant().toEpochMilli()
    return breaks.count { b -> eligible(b) && Instant.ofEpochMilli(b.end).atZone(zone).toLocalDate() == date && breakMillis(b,sleep,zone) >= challenge.minutes*MINUTE && (challenge.kind != ChallengeKind.BEFORE_LUNCH || b.end <= noon) } >= challenge.count
}
data class Comparison(val screenPercent: Int?, val fewerUnlocks: Int?, val samples: Int, val label: String)
fun comparePeriods(todayScreen: Long, todayUnlocks: Int?, history: List<Pair<Long,Int?>>, label: String): Comparison {
    if(history.size < 3) return Comparison(null,null,history.size,"Building your baseline")
    val screen = history.map { it.first }.average()
    val unlocks = history.mapNotNull { it.second }
    return Comparison(if(screen > 0) ((screen-todayScreen)/screen*100).roundToInt() else null,
        if(todayUnlocks != null && unlocks.size >= 3) (unlocks.average()-todayUnlocks).roundToInt() else null, history.size,label)
}

/** Selection advances only on a qualifying naturally observed return, never on an app visit. */
fun shouldCelebrate(b: AwayBreak, now: Long, firstMilestone: Long, lastAt: Long, todayCount: Int, lastId: String): Boolean =
    eligible(b) && b.id != lastId && now-b.end in 0..2*MINUTE && b.rawMillis >= firstMilestone && (lastAt == 0L || b.end-lastAt >= 90*MINUTE) && todayCount < 3

fun awayLabel(millis: Long): String = when { millis < MINUTE -> "<1 min"; millis < 60*MINUTE -> "${millis/MINUTE} min"; else -> "${millis/(60*MINUTE)}h ${millis/MINUTE%60}m" }

fun clockJump(oldWall: Long, oldElapsed: Long, oldBoot: Int?, wall: Long, elapsed: Long, boot: Int): Boolean =
    oldWall > 0 && oldBoot == boot && kotlin.math.abs((wall-oldWall)-(elapsed-oldElapsed)) > 2*MINUTE
