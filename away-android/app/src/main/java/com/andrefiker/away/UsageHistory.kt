package com.andrefiker.away

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.app.AppOpsManager
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
        val prefs = context.getSharedPreferences("away", Context.MODE_PRIVATE)
        val currentBoot = try { android.provider.Settings.Global.getInt(context.contentResolver, android.provider.Settings.Global.BOOT_COUNT, -1) } catch (_: Exception) { -1 }
        var bootAt = prefs.getLong("boot_at", 0L)
        val knownBoot = prefs.getInt("boot_count", -1)
        if (currentBoot >= 0 && currentBoot != knownBoot) {
            // If the reboot receiver was delayed or suppressed, sacrifice history since boot
            // rather than infer a break that may have crossed a reboot.
            bootAt = now
            prefs.edit().putLong("boot_at", now).putInt("boot_count", currentBoot).apply()
        }
        var firstSeen = prefs.getLong("first_seen_at", 0L)
        if (firstSeen == 0L) {
            firstSeen = now
            prefs.edit().putLong("first_seen_at", now).apply()
        }
        val dayStart = localDayStart(now)
        val start = queryStart(now, bootAt, firstSeen)
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

    fun queryStart(now: Long, bootAt: Long, firstSeen: Long, historyWindowMs: Long = 7L * 24 * 60 * 60 * 1000): Long =
        maxOf(bootAt, firstSeen, now - historyWindowMs)

    fun localDayStart(now: Long, timeZone: java.util.TimeZone = java.util.TimeZone.getDefault()): Long =
        java.util.Calendar.getInstance(timeZone).apply {
            timeInMillis = now
            set(java.util.Calendar.HOUR_OF_DAY, 0); set(java.util.Calendar.MINUTE, 0)
            set(java.util.Calendar.SECOND, 0); set(java.util.Calendar.MILLISECOND, 0)
        }.timeInMillis
}
