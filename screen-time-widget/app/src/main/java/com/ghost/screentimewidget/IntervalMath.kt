package com.ghost.screentimewidget

/** Android-independent, stable-sort reducer. Times are wall-clock milliseconds. */
enum class EventKind { SCREEN_ON, SCREEN_OFF, RESUME, PAUSE, RESET, LOCK, RETURN }
data class TimedEvent(val time: Long, val kind: EventKind, val pkg: String = "", val activity: String = "")
data class UsageTotals(val screenMillis: Long, val packages: Map<String, Long>, val screenOn: Boolean)

fun deriveUsage(events: List<TimedEvent>, midnight: Long, now: Long): UsageTotals {
    require(now >= midnight)
    var screenStart: Long? = null
    var screenKnown = false
    var screenTotal = 0L
    val active = mutableMapOf<String, MutableSet<String>>()
    val starts = mutableMapOf<String, Long>()
    val totals = mutableMapOf<String, Long>()
    fun duration(start: Long, end: Long) = (end.coerceAtMost(now) - start.coerceAtLeast(midnight)).coerceAtLeast(0)
    fun close(pkg: String, time: Long) {
        starts.remove(pkg)?.let { totals[pkg] = (totals[pkg] ?: 0) + duration(it, time) }
        active.remove(pkg)
    }
    for (e in events.distinct().filter { it.time <= now }.sortedBy { it.time }) {
        when (e.kind) {
            EventKind.SCREEN_ON -> { screenKnown = true; if (screenStart == null) screenStart = e.time }
            EventKind.SCREEN_OFF, EventKind.RESET -> {
                screenKnown = true
                screenStart?.let { screenTotal += duration(it, e.time) }; screenStart = null
                active.keys.toList().forEach { close(it, e.time) }
            }
            EventKind.RESUME -> if (e.pkg.isNotBlank() && (!screenKnown || screenStart != null)) {
                val activities = active.getOrPut(e.pkg) { mutableSetOf() }
                if (activities.isEmpty()) starts[e.pkg] = e.time
                activities.add(e.activity)
            }
            EventKind.LOCK, EventKind.RETURN -> Unit
            EventKind.PAUSE -> {
                val activities = active[e.pkg] ?: continue
                // Some OEMs omit the class name on pause: close that package conservatively.
                if (e.activity.isBlank()) activities.clear() else activities.remove(e.activity)
                if (activities.isEmpty()) close(e.pkg, e.time)
            }
        }
    }
    screenStart?.let { screenTotal += duration(it, now) }
    active.keys.toList().forEach { close(it, now) }
    return UsageTotals(screenTotal.coerceAtMost(now - midnight), totals.filterValues { it > 0 }, screenStart != null)
}

fun durationLabel(millis: Long): String {
    val minutes = millis.coerceAtLeast(0) / 60000
    return when { minutes >= 60 -> "${minutes / 60}h ${minutes % 60}m"; minutes > 0 -> "${minutes}m"; else -> "<1m" }
}
fun clockLabel(millis: Long): String {
    val s = millis.coerceAtLeast(0) / 1000
    return "%d:%02d:%02d".format(java.util.Locale.ROOT, s / 3600, s / 60 % 60, s % 60)
}
