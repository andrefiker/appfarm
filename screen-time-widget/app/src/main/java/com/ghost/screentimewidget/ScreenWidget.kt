package com.ghost.screentimewidget

import android.app.PendingIntent
import android.appwidget.*
import android.content.*
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import java.text.SimpleDateFormat
import java.util.Locale

class ScreenWidget: AppWidgetProvider() {
    override fun onUpdate(context: Context,manager: AppWidgetManager,ids: IntArray) { refresh(context) }
    override fun onAppWidgetOptionsChanged(context: Context,manager: AppWidgetManager,id: Int,options: Bundle) { refresh(context) }
    override fun onEnabled(context: Context) { Refresh.schedule(context); refresh(context) }
    override fun onReceive(context: Context,intent: Intent) {
        if (intent.action == Refresh.ACTION) refresh(context) else super.onReceive(context,intent)
    }
    private fun refresh(context: Context) {
        val pending = goAsync()
        Refresh.scope.launch { try { withTimeout(8500) { Refresh.schedule(context); Refresh.widgets(context) } } finally { pending.finish() } }
    }
    companion object {
        fun renderAll(context: Context,snapshot: Snapshot,settings: AppSettings) {
            val manager = AppWidgetManager.getInstance(context)
            val ranking = AppCatalog.ranking(context,snapshot,settings)
            for (id in manager.getAppWidgetIds(ComponentName(context,ScreenWidget::class.java))) {
                val views = RemoteViews(context.packageName,R.layout.screen_widget)
                val open = PendingIntent.getActivity(context,0,Intent(context,MainActivity::class.java),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                val refresh = PendingIntent.getBroadcast(context,id,Intent(context,ScreenWidget::class.java).setAction(Refresh.ACTION),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
                views.setOnClickPendingIntent(R.id.widget_root,open)
                views.setOnClickPendingIntent(R.id.refresh,refresh)
                views.setPendingIntentTemplate(R.id.app_rows,PendingIntent.getActivity(context,2,Intent(context,MainActivity::class.java),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE))
                val valid = snapshot.granted && snapshot.message == null
                val running = valid && snapshot.totals.screenOn
                views.setChronometer(R.id.screen_clock,snapshot.elapsedAt - snapshot.totals.screenMillis,if (snapshot.totals.screenMillis + (if (running) (android.os.SystemClock.elapsedRealtime()-snapshot.elapsedAt).coerceAtLeast(0) else 0) < 3600000) "0:%s" else null,running)
                // A stopped Chronometer alone will recalculate when a host reinflates it.
                // Set its text after stop so the displayed frozen duration remains explicit.
                if (!running) views.setTextViewText(R.id.screen_clock,clockLabel(snapshot.totals.screenMillis))
                val date = SimpleDateFormat(if (settings.use24Hour) "HH:mm" else "h:mm a",Locale.getDefault()).format(java.util.Date(snapshot.at))
                val status = snapshot.message ?: if (settings.instant) "Today · refreshed $date" else "Periodic mode · tap to refresh"
                views.setTextViewText(R.id.status,status)
                views.setRemoteAdapter(R.id.app_rows,Intent(context,AppRowsService::class.java).apply {
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id)
                    data = android.net.Uri.parse("widget://apps/$id")
                })
                if (ranking.isEmpty() && valid) views.setTextViewText(R.id.status,"No foreground app time yet · $date")
                manager.updateAppWidget(id,views)
                manager.notifyAppWidgetViewDataChanged(id,R.id.app_rows)
            }
        }
    }
}
