package com.ghost.screentimewidget
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import androidx.core.graphics.drawable.toBitmap

data class RankedApp(val pkg: String, val label: String, val millis: Long, val icon: Bitmap?)
object AppCatalog {
    fun defaults(context: Context): Set<String> = buildSet {
        add("com.android.systemui")
        val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        context.packageManager.queryIntentActivities(home,0).forEach { add(it.activityInfo.packageName) }
    }
    fun ranking(context: Context, snapshot: Snapshot, settings: AppSettings): List<RankedApp> {
        val excluded = settings.exclusions
        return snapshot.totals.packages.filterKeys { it !in excluded }.entries.sortedWith(compareByDescending<Map.Entry<String,Long>> { it.value }.thenBy { it.key }).take(settings.topN).map { (pkg,time) ->
            val info = runCatching { context.packageManager.getApplicationInfo(pkg,0) }.getOrNull()
            RankedApp(pkg,info?.let { context.packageManager.getApplicationLabel(it).toString() } ?: pkg,time,
                runCatching { context.packageManager.getApplicationIcon(pkg).toBitmap(64,64) }.getOrNull())
        }
    }
}
