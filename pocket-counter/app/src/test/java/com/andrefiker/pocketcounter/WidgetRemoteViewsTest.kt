package com.andrefiker.pocketcounter

import android.content.Context
import android.widget.FrameLayout
import android.widget.RemoteViews
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class WidgetRemoteViewsTest {
    private val context: Context = RuntimeEnvironment.getApplication()

    @Test fun widgetRemoteViewsInflateWithAllThreeSections() {
        val views = RemoteViews(context.packageName, R.layout.widget_counter)
        val root = views.apply(context, FrameLayout(context))

        assertNotNull(root.findViewById(R.id.widget_count_0))
        assertNotNull(root.findViewById(R.id.widget_count_1))
        assertNotNull(root.findViewById(R.id.widget_count_2))
        assertEquals("+1", (root.findViewById<android.widget.TextView>(R.id.widget_plus_0)).text.toString())
        assertEquals("+1", (root.findViewById<android.widget.TextView>(R.id.widget_plus_1)).text.toString())
        assertEquals("+1", (root.findViewById<android.widget.TextView>(R.id.widget_plus_2)).text.toString())
    }
}
