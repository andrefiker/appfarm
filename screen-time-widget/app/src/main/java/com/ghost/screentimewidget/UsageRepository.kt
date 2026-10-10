package com.ghost.screentimewidget

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.os.*
import android.provider.Settings
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.time.*
import kotlin.math.abs

fun hasUsageAccess(context: Context): Boolean = context.getSystemService(AppOpsManager::class.java)
    .checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,Process.myUid(),context.packageName) == AppOpsManager.MODE_ALLOWED
fun midnightMillis(now: Long = System.currentTimeMillis()): Long = Instant.ofEpochMilli(now).atZone(ZoneId.systemDefault()).toLocalDate().atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
data class Snapshot(val at: Long, val elapsedAt: Long, val midnight: Long, val totals: UsageTotals, val granted: Boolean, val message: String? = null, val behavior: BehaviorSnapshot? = null)
object UsageRepository {
    private val lock = Mutex()
    @Volatile private var cached: Snapshot? = null
    private val hints = mutableListOf<TimedEvent>()
    @Synchronized fun event(kind: EventKind) { hints.add(TimedEvent(System.currentTimeMillis(),kind,activity="#broadcast")); cached = null }
    @Synchronized fun transition(on: Boolean) = event(if(on) EventKind.SCREEN_ON else EventKind.SCREEN_OFF)
    @Synchronized fun invalidate(clearHints: Boolean = false) { cached = null; if(clearHints) hints.clear() }
    suspend fun read(context: Context, force: Boolean = false, naturalReturn: Boolean = false): Snapshot = withContext(Dispatchers.IO) {
        lock.withLock {
            val now = System.currentTimeMillis(); val elapsed = SystemClock.elapsedRealtime(); val start = midnightMillis(now)
            fun unavailable(granted: Boolean,text: String) = Snapshot(now,elapsed,start,UsageTotals(0,emptyMap(),false),granted,text)
            if(!context.getSystemService(UserManager::class.java).isUserUnlocked) return@withLock unavailable(false,"Unlock phone to load local history")
            val history = LocalHistory(context)
            try {
                if(!hasUsageAccess(context)) { history.put("denied",1); cached = null; return@withLock unavailable(false,"Grant usage access") }
                val hit = cached
                if(!force && !naturalReturn && hit != null && hit.midnight == start && elapsed-hit.elapsedAt in 0..4999 && now-hit.at in 0..4999) return@withLock hit
                val boot = Settings.Global.getInt(context.contentResolver,Settings.Global.BOOT_COUNT,-1)
                val oldWall = history.number("wall"); val oldElapsed = history.number("elapsed"); val oldBoot = history.get("boot")?.toIntOrNull()
                val zone = ZoneId.systemDefault().id
                val changedClock = clockJump(oldWall,oldElapsed,oldBoot,now,elapsed,boot)
                val changedZone = history.get("zone")?.let { it != zone } == true
                if(changedClock) { history.fence(minOf(now,oldWall),maxOf(now,oldWall)); history.resetAt(now,minOf(now,oldWall)) }
                if(changedZone || history.number("denied") == 1L) { history.resetAt(now); history.put("denied",0) }
                if(history.number("trackingSince") == 0L) history.put("trackingSince",now)
                if(oldBoot != null && oldBoot != boot) history.save(listOf(TimedEvent(now-elapsed,EventKind.RESET)),now)
                val queryFrom = maxOf(now-8*DAY,(history.number("lastQuery")-5*MINUTE).takeIf { it > 0 } ?: now-8*DAY)
                if(oldWall > 0 && now-oldWall > 2*DAY) history.resetAt(now) // Retention gap: do not call these full observed days.
                val fences = history.fences()
                val native = mutableListOf<TimedEvent>()
                val usage = context.getSystemService(UsageStatsManager::class.java).queryEvents(queryFrom,now)
                    ?: return@withLock unavailable(true,"Usage history unavailable. Unlock and refresh.")
                val event = UsageEvents.Event()
                while(usage.hasNextEvent()) {
                    usage.getNextEvent(event)
                    val kind = when(event.eventType) {
                        1 -> EventKind.RESUME; 2,23 -> EventKind.PAUSE
                        UsageEvents.Event.SCREEN_INTERACTIVE -> EventKind.SCREEN_ON
                        UsageEvents.Event.SCREEN_NON_INTERACTIVE -> EventKind.SCREEN_OFF
                        UsageEvents.Event.KEYGUARD_SHOWN -> EventKind.LOCK
                        UsageEvents.Event.KEYGUARD_HIDDEN -> EventKind.RETURN
                        26,27 -> EventKind.RESET
                        else -> null
                    }
                    if(kind != null && fences.none { event.timeStamp in it.first..it.second }) native.add(TimedEvent(event.timeStamp,kind,event.packageName ?: "",event.className ?: ""))
                }
                val broadcast = synchronized(this@UsageRepository) { val copy = hints.toList(); hints.clear(); copy }
                // Use OS timestamps where available; persistent journal reconciles delayed duplicate broadcasts.
                val previous = history.events(queryFrom,now)
                val combined = reconcileEvents(previous,native,broadcast)
                history.save(combined,now)
                val events = history.events(start-30*DAY,now)
                var totals = deriveUsage(events.filter {it.time>=start-2*DAY},start,now)
                val interactive = context.getSystemService(PowerManager::class.java).isInteractive
                if(totals.screenOn != interactive) {
                    // Current-state correction is for the secondary clock only. It cannot create a break or reward.
                    totals = deriveUsage(events.filter {it.time>=start-2*DAY}+TimedEvent(now,if(interactive) EventKind.SCREEN_ON else EventKind.SCREEN_OFF),start,now)
                }
                val settings = SettingsStore(context).read()
                val behavior = buildBehavior(events,now,settings,history,naturalReturn)
                history.put("wall",now); history.put("elapsed",elapsed); history.put("boot",boot); history.put("zone",zone); history.put("lastQuery",now)
                val hasScreen = events.any { it.kind == EventKind.SCREEN_ON || it.kind == EventKind.SCREEN_OFF }
                Snapshot(now,elapsed,start,totals,true,if(!hasScreen) "Waiting for screen events; metrics unavailable" else null,behavior).also { cached = it }
            } catch(e: SecurityException) { history.put("denied",1); unavailable(false,"Grant usage access") }
            catch(e: Exception) { Log.w("UsageRepository","Local usage read failed",e); unavailable(true,"Unable to read local history. Tap refresh.") }
            finally { history.close() }
        }
    }
}
fun reconcileEvents(previous: List<TimedEvent>, native: List<TimedEvent>, hints: List<TimedEvent>): List<TimedEvent> {
    val result = (previous+native).distinct().toMutableList()
    for(h in hints) if(result.none { it.kind == h.kind && abs(it.time-h.time) <= 2000 }) result.add(h)
    // Broadcast events carry no package/class. Prefer a delayed system event for the same transition.
    return result.filter { e -> e.activity != "#broadcast" && e.pkg.isNotBlank() || native.none { n -> n != e && n.kind == e.kind && abs(n.time-e.time) <= 2000 } }.distinct()
}
