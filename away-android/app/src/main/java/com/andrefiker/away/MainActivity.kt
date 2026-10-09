package com.andrefiker.away

import android.app.Activity
import android.app.AppOpsManager
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.os.Build
import android.Manifest
import android.content.pm.PackageManager
import android.provider.Settings
import android.widget.Button
import android.widget.TextView

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        val root = findViewById<android.view.View>(R.id.root)
        val initialLeft = root.paddingLeft; val initialTop = root.paddingTop
        val initialRight = root.paddingRight; val initialBottom = root.paddingBottom
        root.setOnApplyWindowInsetsListener { view, insets ->
            val bars = if (Build.VERSION.SDK_INT >= 30) insets.getInsets(android.view.WindowInsets.Type.systemBars()) else null
            view.setPadding(initialLeft + (bars?.left ?: insets.systemWindowInsetLeft),
                initialTop + (bars?.top ?: insets.systemWindowInsetTop),
                initialRight + (bars?.right ?: insets.systemWindowInsetRight),
                initialBottom + (bars?.bottom ?: insets.systemWindowInsetBottom))
            insets
        }
        findViewById<Button>(R.id.permission_button).setOnClickListener {
            startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
        }
        findViewById<Button>(R.id.refresh_button).setOnClickListener { render() }
        val notifications = findViewById<android.widget.CheckBox>(R.id.notification_toggle)
        val preferences = getSharedPreferences("away", MODE_PRIVATE)
        notifications.isChecked = preferences.getBoolean("notify", false)
        notifications.setOnCheckedChangeListener { _, checked ->
            if (checked && Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 10)
            }
            preferences.edit().putBoolean("notify", checked).apply()
        }
        val minimum = findViewById<android.widget.NumberPicker>(R.id.minimum_minutes)
        minimum.minValue = 5; minimum.maxValue = 240; minimum.value = preferences.getInt("minimum_minutes", 60)
        minimum.setOnValueChangedListener { _, _, value -> preferences.edit().putInt("minimum_minutes", value).apply() }
        render()
    }

    override fun onResume() { super.onResume(); render() }

    private fun render() {
        val snapshot = UsageHistory.read(this)
        val status = findViewById<TextView>(R.id.permission_status)
        val permission = findViewById<Button>(R.id.permission_button)
        status.text = if (snapshot.permissionGranted) getString(R.string.access_ready) else getString(R.string.access_needed)
        permission.visibility = if (snapshot.permissionGranted) android.view.View.GONE else android.view.View.VISIBLE
        findViewById<TextView>(R.id.main_duration).text = when {
            !snapshot.permissionGranted -> "—"
            snapshot.ongoingStart != null -> AwayWidgetProvider.formatDuration(System.currentTimeMillis() - snapshot.ongoingStart)
            snapshot.latest != null -> AwayWidgetProvider.formatDuration(snapshot.latest.durationMs)
            else -> getString(R.string.widget_ready)
        }
        findViewById<TextView>(R.id.main_message).text = if (snapshot.ongoingStart != null) getString(R.string.widget_now_away) else getString(R.string.widget_caption_default)
        findViewById<TextView>(R.id.longest_value).text = snapshot.longestToday?.let { AwayWidgetProvider.formatDuration(it.durationMs) } ?: "—"
        findViewById<TextView>(R.id.permission_explanation).text = getString(R.string.permission_explanation)
        findViewById<android.widget.CheckBox>(R.id.notification_toggle).isEnabled = snapshot.permissionGranted
        findViewById<android.widget.NumberPicker>(R.id.minimum_minutes).isEnabled = snapshot.permissionGranted
        AwayWidgetProvider.updateAll(this, AppWidgetManager.getInstance(this))
    }
}
