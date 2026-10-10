package com.ghost.screentimewidget

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.*
import android.os.UserManager
import android.util.Log
import androidx.work.*
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.time.ZonedDateTime
import java.util.concurrent.TimeUnit

object Refresh {
    const val ACTION = "com.ghost.screentimewidget.REFRESH"
    const val MIDNIGHT = "com.ghost.screentimewidget.MIDNIGHT"
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val lock = Mutex()
    suspend fun widgets(context: Context, force: Boolean = true) = lock.withLock {
        val snapshot = UsageRepository.read(context,force)
        val settings = SettingsStore(context).read()
        ScreenWidget.renderAll(context,snapshot,settings)
    }
    fun schedule(context: Context) {
        midnight(context)
        if (!context.getSystemService(UserManager::class.java).isUserUnlocked) return
        WorkManager.getInstance(context).enqueueUniquePeriodicWork("widget-refresh", ExistingPeriodicWorkPolicy.KEEP,
            PeriodicWorkRequestBuilder<RefreshWorker>(15,TimeUnit.MINUTES).build())
    }
    fun midnight(context: Context) {
        val next = ZonedDateTime.now().toLocalDate().plusDays(1).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
        val pending = PendingIntent.getBroadcast(context,71,Intent(context,LifecycleReceiver::class.java).setAction(MIDNIGHT),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        context.getSystemService(AlarmManager::class.java).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next,pending)
    }
    fun service(context: Context, enabled: Boolean) {
        val intent = Intent(context,ScreenService::class.java)
        if (!enabled) { context.stopService(intent); return }
        if (!context.getSystemService(UserManager::class.java).isUserUnlocked || !hasUsageAccess(context)) return
        try { androidx.core.content.ContextCompat.startForegroundService(context,intent) }
        catch (e: RuntimeException) { Log.w("ScreenWidget","Service start deferred; reopen app to start",e) }
    }
}
class RefreshWorker(context: Context,params: WorkerParameters): CoroutineWorker(context,params) {
    override suspend fun doWork(): Result = try { Refresh.widgets(applicationContext); Refresh.midnight(applicationContext); Result.success() } catch (_: Exception) { Result.retry() }
}
class LifecycleReceiver: BroadcastReceiver() {
    override fun onReceive(context: Context,intent: Intent) {
        val result = goAsync()
        Refresh.scope.launch {
            try {
                withTimeout(8500) {
                    if (intent.action in listOf(Intent.ACTION_TIME_CHANGED,Intent.ACTION_TIMEZONE_CHANGED,Intent.ACTION_DATE_CHANGED)) UsageRepository.invalidate(true)
                    Refresh.schedule(context)
                    if (intent.action in listOf(Intent.ACTION_BOOT_COMPLETED,Intent.ACTION_USER_UNLOCKED,Intent.ACTION_MY_PACKAGE_REPLACED)) Refresh.service(context,SettingsStore(context).read().instant)
                    Refresh.widgets(context)
                }
            } catch (e: Exception) { Log.w("ScreenWidget","Deferred receiver refresh",e) }
            finally { result.finish() }
        }
    }
}
