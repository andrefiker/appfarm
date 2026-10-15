package com.andrefiker.pocketcounter

import android.content.Context
import android.view.LayoutInflater
import android.widget.TextView
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

    @Test fun widgetLayoutInflatesWithAllThreeSections() {
        val root = LayoutInflater.from(context).inflate(R.layout.widget_counter, null)

        assertEquals("0/5", root.findViewById<TextView>(R.id.widget_count_0).text.toString())
        assertEquals("0/6", root.findViewById<TextView>(R.id.widget_count_1).text.toString())
        assertEquals("0/3", root.findViewById<TextView>(R.id.widget_count_2).text.toString())
        assertEquals("+1", root.findViewById<TextView>(R.id.widget_plus_0).text.toString())
        assertEquals("+1", root.findViewById<TextView>(R.id.widget_plus_1).text.toString())
        assertEquals("+1", root.findViewById<TextView>(R.id.widget_plus_2).text.toString())
        assertNotNull(root.findViewById(R.id.widget_root))
    }
}
