package com.andrefiker.pocketcounter

/** The three independently stored counts and their fixed reference values. */
data class CounterState(
    val rivotril: Long = 0,
    val cigarro: Long = 0,
    val baseado: Long = 0,
) {
    fun valueAt(index: Int): Long = when (index) {
        0 -> rivotril
        1 -> cigarro
        2 -> baseado
        else -> error("Unknown counter index: $index")
    }

    fun increment(index: Int): CounterState = when (index) {
        0 -> copy(rivotril = rivotril + 1)
        1 -> copy(cigarro = cigarro + 1)
        2 -> copy(baseado = baseado + 1)
        else -> error("Unknown counter index: $index")
    }

    fun reset(): CounterState = Zero

    companion object {
        val labels = listOf("Rivotril", "Cigarro", "Baseado")
        val references = listOf(5L, 6L, 3L)
        val Zero = CounterState()
    }
}
