package com.andrefiker.away

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.PowerManager
import java.util.Calendar

data class AwaySnapshot(
    val latest: BreakResult?,
    val ongoingStart: Long?,
    val longestToday: BreakResult?,
    val permissionGranted: Boolean
)

object UsageHistory {
    fun hasAccess(context: Context): Boolean = try {
        val manager = context.getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
        val mode = manager.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.packageName)
        mode == android.app.AppOpsManager.MODE_ALLOWED
    } catch (_: Exception) { false }

    fun read(context: Context, now: Long = System.currentTimeMillis()): AwaySnapshot {
        if (!hasAccess(context)) return AwaySnapshot(null, null, null, false)
        val bootAt = context.getSharedPreferences("away", Context.MODE_PRIVATE).getLong("boot_at", 0L)
        val dayStart = localDayStart(now)
        val start = maxOf(bootAt, now - 7L * 24 * 60 * 60 * 1000)
        val manager = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val usage = manager.queryEvents(start, now)
        val raw = mutableListOf<ScreenEvent>()
        val event = UsageEvents.Event()
        while (usage.hasNextEvent()) {
            usage.getNextEvent(event)
            val kind = when (event.eventType) {
                UsageEvents.Event.SCREEN_NON_INTERACTIVE -> ScreenEvent.Kind.OFF
                UsageEvents.Event.SCREEN_INTERACTIVE -> ScreenEvent.Kind.INTERACTIVE
                UsageEvents.Event.KEYGUARD_HIDDEN -> ScreenEvent.Kind.UNLOCK
                else -> null
            }
            if (kind != null) raw += ScreenEvent(event.timeStamp, kind)
        }
        val events = deduplicate(raw)
        val completed = IntervalCalculator.completed(events)
        val today = completed.filter { it.endedAt >= dayStart }
        val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        return AwaySnapshot(
            latest = completed.lastOrNull(),
            ongoingStart = IntervalCalculator.ongoingStart(events, power.isInteractive),
            longestToday = today.maxByOrNull { it.durationMs },
            permissionGranted = true
        )
    }

    /** Usage event history can repeat timestamps; collapse exact duplicates deterministically. */
    fun deduplicate(events: List<ScreenEvent>): List<ScreenEvent> = events.distinctBy { it.at to it.kind }
        .sortedWith(compareBy<ScreenEvent> { it.at }.thenBy { it.kind.ordinal })

    fun needsAccess(granted: Boolean): Boolean = !granted

    fun localDayStart(now: Long, timeZone: java.util.TimeZone = java.util.TimeZone.getDefault()): Long =
        java.util.Calendar.getInstance(timeZone).apply {
            timeInMillis = now
            set(java.util.Calendar.HOUR_OF_DAY, 0); set(java.util.Calendar.MINUTE, 0)
            set(java.util.Calendar.SECOND, 0); set(java.util.Calendar.MILLISECOND, 0)
        }.timeInMillis
}
