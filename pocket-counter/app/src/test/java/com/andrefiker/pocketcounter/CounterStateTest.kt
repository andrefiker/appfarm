package com.andrefiker.pocketcounter

import org.junit.Assert.assertEquals
import org.junit.Test

class CounterStateTest {
    @Test fun incrementsOnlySelectedCounter() {
        val start = CounterState.Zero
        assertEquals(CounterState(1, 0, 0), start.increment(0))
        assertEquals(CounterState(0, 1, 0), start.increment(1))
        assertEquals(CounterState(0, 0, 1), start.increment(2))
    }

    @Test fun incrementsCanPassReferenceValues() {
        val after = CounterState(5, 6, 3).increment(0).increment(1).increment(2)
        assertEquals(CounterState(6, 7, 4), after)
    }

    @Test fun resetStateIsAllZero() {
        assertEquals(CounterState.Zero, CounterState(17, 8, 21).reset())
    }
}
