package com.ghost.screentimewidget

import android.app.PendingIntent
import android.appwidget.*
import android.content.*
import android.content.res.Configuration
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout
import java.text.SimpleDateFormat
import java.util.Locale

fun darkTheme(context: Context,settings: AppSettings) = settings.theme == "dark" || (settings.theme == "system" && context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK == Configuration.UI_MODE_NIGHT_YES)
class ScreenWidget: AppWidgetProvider() {
    override fun onUpdate(context: Context,manager: AppWidgetManager,ids: IntArray) { refresh(context) }
    override fun onAppWidgetOptionsChanged(context: Context,manager: AppWidgetManager,id: Int,options: Bundle) { refresh(context) }
    override fun onEnabled(context: Context) { Refresh.schedule(context); refresh(context) }
    override fun onReceive(context: Context,intent: Intent) { if(intent.action == Refresh.ACTION) refresh(context) else super.onReceive(context,intent) }
    private fun refresh(context: Context) {
        val pending = goAsync()
        Refresh.scope.launch { try { withTimeout(8500) { Refresh.schedule(context); Refresh.widgets(context) } } finally { pending.finish() } }
    }
    companion object {
        fun buildViews(context: Context,snapshot: Snapshot,settings: AppSettings,id: Int,options: Bundle): RemoteViews {
            val dark = darkTheme(context,settings)
            val ink = android.graphics.Color.parseColor(if(dark) "#E4EEE7" else "#183E32")
            val muted = android.graphics.Color.parseColor(if(dark) "#BAC8BF" else "#53685B")
            val expanded = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,250) >= 230 && options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,110) >= 180
            val views = RemoteViews(context.packageName,if(expanded) R.layout.screen_widget else R.layout.widget_compact)
            val open = PendingIntent.getActivity(context,0,Intent(context,MainActivity::class.java),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            views.setOnClickPendingIntent(R.id.widget_root,open)
            views.setInt(R.id.widget_root,"setBackgroundResource",if(dark) R.drawable.widget_dark else R.drawable.widget_background)
            for(view in listOf(R.id.away_number,R.id.away_title,R.id.away_details)) views.setTextColor(view,if(view==R.id.away_number) ink else muted)
            val b = snapshot.behavior
            val valid = snapshot.granted && snapshot.message == null && b != null
            views.setTextViewText(R.id.away_title,if(valid && expanded) "TIME AWAY · DAYTIME" else if(valid) "DAYTIME AWAY" else "TIME AWAY")
            views.setTextViewText(R.id.away_number,if(valid && b?.last != null) awayLabel(b.lastDaytime) else "—")
            views.setTextViewText(R.id.away_details,if(!valid) snapshot.message ?: "Grant usage access" else if(b!!.last == null) "Waiting for your next break" else "Longest ${awayLabel(b.today.longest)} · ${b.today.meaningful} breaks${if(!b.last.confirmed) " · estimated" else ""}")
            if(expanded) {
                for(view in listOf(R.id.status,R.id.screen_clock,R.id.reinforcement,R.id.widget_challenge,R.id.secondary_label,R.id.comparison)) views.setTextColor(view,muted)
                val running = valid && snapshot.totals.screenOn && settings.instant && ScreenService.running
                views.setChronometer(R.id.screen_clock,snapshot.elapsedAt-snapshot.totals.screenMillis,if(snapshot.totals.screenMillis < 3600000) "0:%s" else null,running)
                if(!running) views.setTextViewText(R.id.screen_clock,if(valid) clockLabel(snapshot.totals.screenMillis) else "—")
                views.setTextViewText(R.id.secondary_label,"Screen on · ${b?.today?.unlocks?.let { "$it recorded unlocks" } ?: "unlocks unavailable"}")
                val rich = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,180) >= 250
                for(view in listOf(R.id.reinforcement,R.id.comparison,R.id.widget_challenge)) views.setViewVisibility(view,if(rich) View.VISIBLE else View.GONE)
                val percent = b?.comparison?.screenPercent
                views.setTextViewText(R.id.comparison,if(valid && percent != null) when { percent>0 -> "↓ $percent% screen time ${b.comparison.label}"; percent==0 -> "Similar screen time ${b.comparison.label}"; else -> "Screen time ${b.comparison.label}" } else "Building a comparable baseline")
                views.setTextViewText(R.id.reinforcement,if(valid) b?.message ?: "Measured locked/screen-off time; sleep excluded." else snapshot.message)
                views.setTextViewText(R.id.widget_challenge,if(valid) "${if(b!!.challengeComplete) "✓ Quietly done" else "Optional"} · ${b.challenge.text}" else "Everything stays on this phone.")
                val date = SimpleDateFormat(if(settings.use24Hour) "HH:mm" else "h:mm a",Locale.getDefault()).format(java.util.Date(snapshot.at))
                views.setTextViewText(R.id.status,if(running) "Instant mode · $date" else "Snapshot · $date")
                val showApps = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,180) >= 320
                views.setViewVisibility(R.id.app_rows,if(showApps) View.VISIBLE else View.GONE)
                if(showApps) {
                    views.setPendingIntentTemplate(R.id.app_rows,PendingIntent.getActivity(context,2,Intent(context,MainActivity::class.java),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE))
                    views.setRemoteAdapter(R.id.app_rows,Intent(context,AppRowsService::class.java).apply { putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id); data=android.net.Uri.parse("widget://apps/$id/${settings.theme}") })
                }
                views.setOnClickPendingIntent(R.id.refresh,PendingIntent.getBroadcast(context,id,Intent(context,ScreenWidget::class.java).setAction(Refresh.ACTION),PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
                views.setInt(R.id.refresh,"setColorFilter",muted)
            }
            return views
        }
        fun renderAll(context: Context,snapshot: Snapshot,settings: AppSettings) {
            val manager = AppWidgetManager.getInstance(context)
            for(id in manager.getAppWidgetIds(ComponentName(context,ScreenWidget::class.java))) {
                val options = manager.getAppWidgetOptions(id)
                manager.updateAppWidget(id,buildViews(context,snapshot,settings,id,options))
                if(options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,250)>=230 && options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,110)>=180) manager.notifyAppWidgetViewDataChanged(id,R.id.app_rows)
            }
        }
    }
}
