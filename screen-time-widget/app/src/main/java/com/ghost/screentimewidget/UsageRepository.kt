package com.ghost.screentimewidget

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.PowerManager
import android.os.Process
import android.os.SystemClock
import android.os.UserManager
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.time.ZonedDateTime

fun hasUsageAccess(context: Context): Boolean {
    val ops = context.getSystemService(AppOpsManager::class.java)
    return ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName) == AppOpsManager.MODE_ALLOWED
}
fun midnightMillis(now: Long = System.currentTimeMillis()): Long = java.time.Instant.ofEpochMilli(now).atZone(java.time.ZoneId.systemDefault()).toLocalDate().atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()

data class Snapshot(val at: Long, val elapsedAt: Long, val midnight: Long, val totals: UsageTotals, val granted: Boolean, val message: String? = null)
object UsageRepository {
    private val lock = Mutex()
    @Volatile private var cached: Snapshot? = null
    private val hints = mutableListOf<TimedEvent>()
    @Synchronized fun transition(on: Boolean) {
        hints.add(TimedEvent(System.currentTimeMillis(), if (on) EventKind.SCREEN_ON else EventKind.SCREEN_OFF))
        if (hints.size > 256) hints.removeAt(0)
        cached = null
    }
    @Synchronized fun invalidate(clearHints: Boolean = false) { cached = null; if (clearHints) hints.clear() }
    suspend fun read(context: Context, force: Boolean = false): Snapshot = withContext(Dispatchers.IO) {
        lock.withLock {
            val now = System.currentTimeMillis()
            val elapsed = SystemClock.elapsedRealtime()
            val start = midnightMillis(now)
            if (!context.getSystemService(UserManager::class.java).isUserUnlocked) return@withLock Snapshot(now,elapsed,start,UsageTotals(0, emptyMap(),false),false,"Unlock phone to load today's usage")
            if (!hasUsageAccess(context)) return@withLock Snapshot(now,elapsed,start,UsageTotals(0,emptyMap(),false),false,"Grant usage access")
            val hit = cached
            if (!force && hit != null && hit.midnight == start && elapsed - hit.elapsedAt in 0..4999 && now - hit.at in 0..4999) return@withLock hit
            try {
                val events = mutableListOf<TimedEvent>()
                val usage = context.getSystemService(UsageStatsManager::class.java).queryEvents(start - 48 * 3600000L, now)
                if (usage == null) return@withLock Snapshot(now,elapsed,start,UsageTotals(0,emptyMap(),false),true,"Usage history unavailable; unlock and refresh")
                val event = UsageEvents.Event()
                while (usage.hasNextEvent()) {
                    usage.getNextEvent(event)
                    // RESUMED/PAUSED and legacy MOVE_TO_FOREGROUND/BACKGROUND share IDs 1/2.
                    val kind = when (event.eventType) {
                        1 -> EventKind.RESUME; 2, 23 -> EventKind.PAUSE
                        UsageEvents.Event.SCREEN_INTERACTIVE -> EventKind.SCREEN_ON
                        UsageEvents.Event.SCREEN_NON_INTERACTIVE -> EventKind.SCREEN_OFF
                        UsageEvents.Event.DEVICE_SHUTDOWN, UsageEvents.Event.DEVICE_STARTUP -> EventKind.RESET
                        else -> null
                    }
                    if (kind != null) events.add(TimedEvent(event.timeStamp,kind,event.packageName ?: "",event.className ?: ""))
                }
                // Broadcast hints only bridge delayed UsageEvents delivery; never store usage totals.
                synchronized(this@UsageRepository) {
                    hints.removeAll { h -> h.time < start || events.any { it.kind == h.kind && kotlin.math.abs(it.time - h.time) < 2000 } }
                    events.addAll(hints.filter { it.time <= now })
                }
                var totals = deriveUsage(events,start,now)
                val interactive = context.getSystemService(PowerManager::class.java).isInteractive
                if (totals.screenOn != interactive) {
                    events.add(TimedEvent(now,if (interactive) EventKind.SCREEN_ON else EventKind.SCREEN_OFF))
                    totals = deriveUsage(events,start,now)
                }
                Snapshot(now,elapsed,start,totals,true, if (events.isEmpty()) "No usage events available yet" else null).also { cached = it }
            } catch (e: SecurityException) {
                Snapshot(now,elapsed,start,UsageTotals(0,emptyMap(),false),false,"Grant usage access")
            } catch (e: Exception) {
                Log.w("UsageRepository","Local usage query failed",e)
                Snapshot(now,elapsed,start,UsageTotals(0,emptyMap(),false),true,"Unable to read usage. Tap refresh.")
            }
        }
    }
}
