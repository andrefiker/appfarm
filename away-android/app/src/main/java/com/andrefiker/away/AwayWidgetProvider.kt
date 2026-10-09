package com.andrefiker.away

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import java.util.concurrent.TimeUnit

class AwayWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = updateAll(context, manager)
    override fun onReceive(context: Context, intent: android.content.Intent) {
        super.onReceive(context, intent)
        if (intent.action == android.content.Intent.ACTION_USER_PRESENT) {
            BreakNotification.maybeNotify(context)
            updateAll(context, AppWidgetManager.getInstance(context))
        }
    }

    companion object {
        fun updateAll(context: Context, manager: AppWidgetManager = AppWidgetManager.getInstance(context)) {
            for (id in manager.getAppWidgetIds(android.content.ComponentName(context, AwayWidgetProvider::class.java))) {
                val options = manager.getAppWidgetOptions(id)
                val expanded = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0) >= 180 ||
                    options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0) >= 100
                val layout = if (expanded) R.layout.widget_expanded else R.layout.widget_compact
                val views = RemoteViews(context.packageName, layout)
                val snapshot = UsageHistory.read(context)
                if (!snapshot.permissionGranted) {
                    views.setTextViewText(R.id.widget_duration, context.getString(R.string.widget_permission))
                    views.setTextViewText(R.id.widget_caption, context.getString(R.string.widget_setup))
                } else {
                    val start = snapshot.ongoingStart
                    val duration = if (start != null) System.currentTimeMillis() - start else snapshot.latest?.durationMs
                    views.setTextViewText(R.id.widget_duration, duration?.let(::formatDuration) ?: context.getString(R.string.widget_ready))
                    views.setTextViewText(R.id.widget_caption, if (start != null) context.getString(R.string.widget_now_away) else context.getString(R.string.widget_caption_default))
                    if (expanded) {
                        val longest = snapshot.longestToday?.durationMs
                        views.setTextViewText(R.id.widget_longest, context.getString(R.string.longest_today, longest?.let(::formatDuration) ?: "—"))
                    }
                }
                val launch = android.app.PendingIntent.getActivity(context, 0,
                    android.content.Intent(context, MainActivity::class.java), android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE)
                views.setOnClickPendingIntent(R.id.widget_root, launch)
                manager.updateAppWidget(id, views)
            }
        }

        fun formatDuration(ms: Long): String {
            val minutes = TimeUnit.MILLISECONDS.toMinutes(ms).coerceAtLeast(0)
            val hours = minutes / 60
            val rem = minutes % 60
            return if (hours > 0) "${hours}h ${rem}m" else "${rem}m"
        }
    }
}
