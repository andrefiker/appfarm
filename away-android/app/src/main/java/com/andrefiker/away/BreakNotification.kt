package com.andrefiker.away

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build

object BreakNotification {
    fun maybeNotify(context: Context, now: Long = System.currentTimeMillis()) {
        val prefs = context.getSharedPreferences("away", Context.MODE_PRIVATE)
        if (!prefs.getBoolean("notify", false) || !UsageHistory.hasAccess(context)) return
        if (Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val latest = UsageHistory.read(context, now).latest ?: return
        if (now - latest.endedAt !in 0..90_000L) return
        if (prefs.getLong("notified_at", 0L) == latest.endedAt) return
        val threshold = prefs.getInt("minimum_minutes", 60) * 60_000L
        if (latest.durationMs < threshold) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channel = "away_breaks"
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(
            NotificationChannel(channel, context.getString(R.string.notification_channel), NotificationManager.IMPORTANCE_DEFAULT)
        )
        val duration = AwayWidgetProvider.formatDuration(latest.durationMs)
        val notification = if (Build.VERSION.SDK_INT >= 26) android.app.Notification.Builder(context, channel) else android.app.Notification.Builder(context)
        notification.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(context.getString(R.string.notification_title))
            .setContentText(context.getString(R.string.notification_body, duration))
            .setAutoCancel(true)
        manager.notify(1001, notification.build())
        prefs.edit().putLong("notified_at", latest.endedAt).apply()
    }
}
