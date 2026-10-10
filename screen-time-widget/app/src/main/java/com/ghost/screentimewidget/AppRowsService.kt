package com.ghost.screentimewidget
import android.content.Intent
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import kotlinx.coroutines.runBlocking

class AppRowsService: RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory = object: RemoteViewsFactory {
        private var rows = emptyList<RankedApp>()
        override fun onCreate() {}
        override fun onDataSetChanged() {
            rows = runBlocking {
                val data = UsageRepository.read(applicationContext)
                if (!data.granted || data.message != null) emptyList() else AppCatalog.ranking(applicationContext,data,SettingsStore(applicationContext).read())
            }
        }
        override fun onDestroy() { rows = emptyList() }
        override fun getCount() = rows.size
        override fun getViewAt(position: Int): RemoteViews? {
            val app = rows.getOrNull(position) ?: return null
            return RemoteViews(packageName,R.layout.widget_app_row).apply {
                setTextViewText(R.id.app_label,app.label)
                setTextViewText(R.id.app_duration,durationLabel(app.millis))
                app.icon?.let { setImageViewBitmap(R.id.app_icon,it) }
                setProgressBar(R.id.app_bar,1000,((app.millis.toDouble() / rows.first().millis.coerceAtLeast(1))*1000).toInt(),false)
                setContentDescription(R.id.app_label,"${app.label}, ${durationLabel(app.millis)}")
                setOnClickFillInIntent(R.id.app_row,Intent())
            }
        }
        override fun getLoadingView(): RemoteViews? = null
        override fun getViewTypeCount() = 1
        override fun getItemId(position: Int) = rows.getOrNull(position)?.pkg?.hashCode()?.toLong() ?: position.toLong()
        override fun hasStableIds() = true
    }
}
