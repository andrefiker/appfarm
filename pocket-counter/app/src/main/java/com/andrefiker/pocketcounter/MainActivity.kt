package com.andrefiker.pocketcounter

import android.app.AlertDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.app.Activity

class MainActivity : Activity() {
    private lateinit var store: CounterStore
    private lateinit var values: List<TextView>

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        store = CounterStore(this)
        setContentView(R.layout.activity_main)

        val row = findViewById<LinearLayout>(R.id.counter_row)
        val counters = CounterState.labels.indices.map { index ->
            val card = LayoutInflater.from(this).inflate(R.layout.item_counter, row, false)
            card.findViewById<TextView>(R.id.counter_label).text = CounterState.labels[index]
            card.findViewById<Button>(R.id.increment_button).setOnClickListener {
                store.increment(index)
                render()
                CounterWidgetProvider.updateAll(this)
            }
            row.addView(card)
            card.findViewById<TextView>(R.id.counter_value)
        }
        values = counters

        findViewById<Button>(R.id.reset_button).setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle(R.string.reset_title)
                .setMessage(R.string.reset_message)
                .setNegativeButton(R.string.cancel, null)
                .setPositiveButton(R.string.reset) { _, _ ->
                    store.reset()
                    render()
                    CounterWidgetProvider.updateAll(this)
                }
                .show()
        }
        render()
    }

    override fun onResume() {
        super.onResume()
        if (::store.isInitialized && ::values.isInitialized) render()
    }

    private fun render() {
        val state = store.read()
        values.forEachIndexed { index, view ->
            view.text = "${state.valueAt(index)}/${CounterState.references[index]}"
        }
    }
}
