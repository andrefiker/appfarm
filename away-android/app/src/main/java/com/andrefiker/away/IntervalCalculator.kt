package com.andrefiker.away

/** Screen-off is a proxy for disengagement, never proof the person was physically away. */
data class ScreenEvent(val at: Long, val kind: Kind) {
    enum class Kind { OFF, INTERACTIVE, UNLOCK, REBOOT }
}

data class BreakResult(val startedAt: Long, val endedAt: Long, val durationMs: Long)

object IntervalCalculator {
    /**
     * A valid completed interval is one uninterrupted OFF -> UNLOCK sequence. Any screen
     * activation, duplicate/out-of-order timestamp, or reboot invalidates the candidate.
     */
    fun completed(events: List<ScreenEvent>, minimumMs: Long = 0L): List<BreakResult> {
        val sorted = events.sortedWith(compareBy<ScreenEvent> { it.at }.thenBy { order(it.kind) })
        val result = mutableListOf<BreakResult>()
        var offAt: Long? = null
        var lastAt = Long.MIN_VALUE
        for (event in sorted) {
            if (event.at < lastAt) continue
            when (event.kind) {
                ScreenEvent.Kind.OFF -> if (offAt == null) offAt = event.at
                ScreenEvent.Kind.INTERACTIVE, ScreenEvent.Kind.REBOOT -> offAt = null
                ScreenEvent.Kind.UNLOCK -> {
                    val start = offAt
                    if (start != null && event.at > start && event.at - start >= minimumMs) {
                        result += BreakResult(start, event.at, event.at - start)
                    }
                    offAt = null
                }
            }
            lastAt = event.at
        }
        return result
    }

    fun ongoingStart(events: List<ScreenEvent>, isInteractive: Boolean): Long? {
        if (isInteractive) return null
        var offAt: Long? = null
        var lastAt = Long.MIN_VALUE
        for (event in events.sortedWith(compareBy<ScreenEvent> { it.at }.thenBy { order(it.kind) })) {
            if (event.at < lastAt) continue
            when (event.kind) {
                ScreenEvent.Kind.OFF -> if (offAt == null) offAt = event.at
                ScreenEvent.Kind.INTERACTIVE, ScreenEvent.Kind.UNLOCK, ScreenEvent.Kind.REBOOT -> offAt = null
            }
            lastAt = event.at
        }
        return offAt
    }

    private fun order(kind: ScreenEvent.Kind) = when (kind) {
        ScreenEvent.Kind.REBOOT -> 0
        ScreenEvent.Kind.INTERACTIVE -> 1
        ScreenEvent.Kind.OFF -> 2
        ScreenEvent.Kind.UNLOCK -> 3
    }
}
