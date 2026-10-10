package com.ghost.screentimewidget

import android.app.*
import android.content.*
import android.content.pm.ServiceInfo
import android.os.*
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.*
import java.time.ZonedDateTime

class ScreenService: Service() {
    companion object { @Volatile var running = false }
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val handler = Handler(Looper.getMainLooper())
    private val hourTask = Runnable { scope.launch { updateOnce() } }
    private val midnightTask = object: Runnable {
        override fun run() { scope.launch { UsageRepository.invalidate(); updateOnce() }; scheduleMidnight() }
    }
    private val receiver = object: BroadcastReceiver() {
        override fun onReceive(context: Context,intent: Intent) {
            when (intent.action) {
                Intent.ACTION_SCREEN_ON -> UsageRepository.transition(true)
                Intent.ACTION_SCREEN_OFF -> UsageRepository.transition(false)
                Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED, Intent.ACTION_DATE_CHANGED -> { UsageRepository.invalidate(true); scheduleMidnight() }
                else -> UsageRepository.invalidate()
            }
            scope.launch { updateOnce(); Refresh.midnight(this@ScreenService) }
        }
    }
    override fun onCreate() {
        super.onCreate()
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel("instant","Instant widget updates",NotificationManager.IMPORTANCE_LOW).apply { setSound(null,null); enableVibration(false); setShowBadge(false) })
        val open = PendingIntent.getActivity(this,0,Intent(this,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE)
        val notification = NotificationCompat.Builder(this,"instant").setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Screen Time Widget").setContentText("Instant screen on/off updates are enabled")
            .setContentIntent(open).setOngoing(true).setSilent(true).setPriority(NotificationCompat.PRIORITY_LOW).build()
        if (Build.VERSION.SDK_INT >= 34) startForeground(1,notification,ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE) else startForeground(1,notification)
        running = true
        ContextCompat.registerReceiver(this,receiver,IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_ON); addAction(Intent.ACTION_SCREEN_OFF); addAction(Intent.ACTION_USER_PRESENT)
            addAction(Intent.ACTION_DATE_CHANGED); addAction(Intent.ACTION_TIME_CHANGED); addAction(Intent.ACTION_TIMEZONE_CHANGED)
        },ContextCompat.RECEIVER_NOT_EXPORTED)
        scheduleMidnight()
    }
    private suspend fun updateOnce() {
        Refresh.widgets(this@ScreenService)
        val s = UsageRepository.read(this@ScreenService)
        val remaining = 3600000L - s.totals.screenMillis - (SystemClock.elapsedRealtime() - s.elapsedAt)
        handler.post {
            handler.removeCallbacks(hourTask)
            if (s.granted && s.totals.screenOn && remaining > 0) handler.postDelayed(hourTask,remaining)
        }
    }
    private fun scheduleMidnight() {
        handler.removeCallbacks(midnightTask)
        val next = ZonedDateTime.now().toLocalDate().plusDays(1).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
        handler.postDelayed(midnightTask,(next-System.currentTimeMillis()).coerceAtLeast(1))
    }
    override fun onStartCommand(intent: Intent?,flags: Int,startId: Int): Int {
        scope.launch {
            if (!SettingsStore(this@ScreenService).read().instant || !hasUsageAccess(this@ScreenService)) stopSelf()
            else { Refresh.schedule(this@ScreenService); updateOnce() }
        }
        return START_STICKY
    }
    override fun onBind(intent: Intent?) = null
    override fun onDestroy() { running = false; unregisterReceiver(receiver); handler.removeCallbacks(midnightTask); handler.removeCallbacks(hourTask); scope.cancel(); super.onDestroy() }
}

class ScreenTimeApplication: Application(), androidx.work.Configuration.Provider {
    override val workManagerConfiguration: androidx.work.Configuration
        get() = androidx.work.Configuration.Builder().build()
    private val receiver = object: BroadcastReceiver() {
        override fun onReceive(context: Context,intent: Intent) {
            if (ScreenService.running) return
            when (intent.action) {
                Intent.ACTION_SCREEN_ON -> UsageRepository.transition(true)
                Intent.ACTION_SCREEN_OFF -> UsageRepository.transition(false)
                else -> UsageRepository.invalidate()
            }
            Refresh.scope.launch { Refresh.widgets(context) }
        }
    }
    override fun onCreate() {
        super.onCreate()
        ContextCompat.registerReceiver(this,receiver,IntentFilter().apply { addAction(Intent.ACTION_SCREEN_ON); addAction(Intent.ACTION_SCREEN_OFF); addAction(Intent.ACTION_USER_PRESENT) },ContextCompat.RECEIVER_NOT_EXPORTED)
    }
}
