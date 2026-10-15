package com.andrefiker.pocketcounter

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class CounterActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_INCREMENT) return
        val index = intent.getIntExtra(EXTRA_INDEX, -1)
        if (index !in CounterState.labels.indices) return
        CounterStore(context).increment(index)
        CounterWidgetProvider.updateAll(context)
    }

    companion object {
        const val ACTION_INCREMENT = "com.andrefiker.pocketcounter.INCREMENT"
        const val EXTRA_INDEX = "counter_index"
    }
}
