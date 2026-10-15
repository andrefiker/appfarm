package com.andrefiker.pocketcounter

import android.content.Context
import android.content.Intent
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class CounterStoreTest {
    private val context: Context = RuntimeEnvironment.getApplication()

    @Before fun clearSavedState() {
        context.getSharedPreferences("counter_state", Context.MODE_PRIVATE)
            .edit().clear().commit()
    }

    @Test fun savedCountsSurviveStoreRecreation() {
        CounterStore(context).increment(1)
        CounterStore(context).increment(1)

        assertEquals(CounterState(0, 2, 0), CounterStore(context).read())
    }

    @Test fun broadcastActionChangesOnlyItsOwnCounterAndCanExceedReference() {
        val receiver = CounterActionReceiver()
        repeat(6) {
            receiver.onReceive(
                context,
                Intent(context, CounterActionReceiver::class.java)
                    .setAction(CounterActionReceiver.ACTION_INCREMENT)
                    .putExtra(CounterActionReceiver.EXTRA_INDEX, 1),
            )
        }

        assertEquals(CounterState(0, 6, 0), CounterStore(context).read())
    }

    @Test fun resetWritesZeroForEveryCounter() {
        CounterStore(context).increment(0)
        CounterStore(context).increment(1)
        CounterStore(context).increment(2)

        CounterStore(context).reset()

        assertEquals(CounterState.Zero, CounterStore(context).read())
    }
}
