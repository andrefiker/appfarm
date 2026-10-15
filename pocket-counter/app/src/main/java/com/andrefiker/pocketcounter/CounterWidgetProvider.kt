package com.andrefiker.pocketcounter

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

class CounterWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        appWidgetIds.forEach { updateWidget(context, appWidgetManager, it) }
    }

    companion object {
        fun updateAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, CounterWidgetProvider::class.java))
            ids.forEach { updateWidget(context, manager, it) }
        }

        private fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
            val state = CounterStore(context).read()
            val views = RemoteViews(context.packageName, R.layout.widget_counter)
            val countViewIds = intArrayOf(R.id.widget_count_0, R.id.widget_count_1, R.id.widget_count_2)
            val buttonViewIds = intArrayOf(R.id.widget_plus_0, R.id.widget_plus_1, R.id.widget_plus_2)
            CounterState.labels.indices.forEach { index ->
                val value = state.valueAt(index)
                views.setTextViewText(countViewIds[index], "$value/${CounterState.references[index]}")
                val intent = Intent(context, CounterActionReceiver::class.java).apply {
                    action = CounterActionReceiver.ACTION_INCREMENT
                    data = Uri.parse("pocketcounter://increment/$index")
                    putExtra(CounterActionReceiver.EXTRA_INDEX, index)
                }
                val pending = PendingIntent.getBroadcast(
                    context,
                    index,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
                views.setOnClickPendingIntent(buttonViewIds[index], pending)
                views.setContentDescription(buttonViewIds[index], "${CounterState.labels[index]} +1")
            }
            manager.updateAppWidget(widgetId, views)
        }
    }
}
