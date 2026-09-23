package com.andrefiker.lootpayments

import java.text.NumberFormat
import java.math.BigDecimal
import java.util.Locale

/** Strict BRL entry, stored only as integer cents. No rounding of fractions. */
object Money {
    fun parse(input: String): Long? {
        val trimmed = input.trim().removePrefix("R$").trim().replace(Regex("[\\s\\u00A0]"), "")
        if (trimmed.isEmpty()) return null
        val normalized = when {
            ',' in trimmed -> {
                val parts = trimmed.split(',')
                if (parts.size != 2 || !parts[0].matches(Regex("[0-9]{1,3}(\\.[0-9]{3})*|[0-9]+")) || !parts[1].matches(Regex("[0-9]{1,2}"))) return null
                parts[0].replace(".", "") + "." + parts[1]
            }
            '.' in trimmed -> {
                // A lone dot is accepted as a decimal separator only for 1–2 fractional digits.
                if (!trimmed.matches(Regex("[0-9]+\\.[0-9]{1,2}"))) return null
                trimmed
            }
            else -> { if (!trimmed.matches(Regex("[0-9]+"))) return null; trimmed }
        }
        val parts = normalized.split('.')
        return try {
            val whole = parts[0].toLong()
            val fraction = if (parts.size == 1) 0L else parts[1].padEnd(2, '0').toLong()
            Math.addExact(Math.multiplyExact(whole, 100), fraction)
        } catch (_: ArithmeticException) { null }
    }

    fun format(cents: Long): String = NumberFormat.getCurrencyInstance(Locale("pt", "BR")).format(BigDecimal.valueOf(cents, 2))
}

data class MonthLine(val expected: Long, val paid: Long, val active: Boolean, val forceIncomplete: Boolean = false) {
    val full: Boolean get() = active && expected > 0 && !forceIncomplete && paid >= expected
}
data class Totals(val count: Int, val expected: Long, val paid: Long) {
    val remaining: Long get() = (expected - paid).coerceAtLeast(0)
}

object PaymentRules {
    fun totals(lines: List<MonthLine>): Totals {
        val active = lines.filter { it.active }
        return Totals(active.size, active.sumOf { it.expected }, active.sumOf { it.paid })
    }
}
