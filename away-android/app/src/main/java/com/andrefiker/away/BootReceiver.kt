package com.andrefiker.away

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.appwidget.AppWidgetManager

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        context.getSharedPreferences("away", Context.MODE_PRIVATE).edit()
            .putLong("boot_at", System.currentTimeMillis())
            .putInt("boot_count", try { android.provider.Settings.Global.getInt(context.contentResolver, android.provider.Settings.Global.BOOT_COUNT, -1) } catch (_: Exception) { -1 })
            .apply()
        AwayWidgetProvider.updateAll(context, AppWidgetManager.getInstance(context))
    }
}
