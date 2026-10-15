package com.andrefiker.pocketcounter

import android.content.Context
import android.content.SharedPreferences

/** Small local-only store. SharedPreferences are retained across app/widget refresh and reboot. */
class CounterStore(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("counter_state", Context.MODE_PRIVATE)

    @Synchronized
    fun read(): CounterState = CounterState(
        rivotril = prefs.getLong(KEY_RIVOTRIL, 0L),
        cigarro = prefs.getLong(KEY_CIGARRO, 0L),
        baseado = prefs.getLong(KEY_BASEADO, 0L),
    )

    @Synchronized
    fun increment(index: Int): CounterState {
        val updated = read().increment(index)
        write(updated)
        return updated
    }

    @Synchronized
    fun reset(): CounterState {
        val reset = read().reset()
        write(reset)
        return reset
    }

    private fun write(state: CounterState) {
        prefs.edit()
            .putLong(KEY_RIVOTRIL, state.rivotril)
            .putLong(KEY_CIGARRO, state.cigarro)
            .putLong(KEY_BASEADO, state.baseado)
            .apply()
    }

    private companion object {
        const val KEY_RIVOTRIL = "rivotril"
        const val KEY_CIGARRO = "cigarro"
        const val KEY_BASEADO = "baseado"
    }
}
