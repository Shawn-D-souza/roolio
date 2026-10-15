package expo.modules.roolio.core.budgets

import java.util.Calendar

internal enum class BudgetPeriod(val key: String) {
  DAY("day"),
  WEEK("week"),
  MONTH("month");

  companion object {
    fun from(key: String): BudgetPeriod =
      entries.firstOrNull { it.key == key } ?: throw IllegalArgumentException("Unknown period \"$key\"")
  }
}

// Period math in device local time. java.util.Calendar keeps this working on
// API 24-25, where java.time needs desugaring.
internal object Periods {
  // Midnight starting the period that contains `time`.
  fun periodStart(period: BudgetPeriod, time: Long, firstDayOfWeek: Int): Long {
    val calendar = startOfDay(time)
    when (period) {
      BudgetPeriod.DAY -> Unit
      BudgetPeriod.WEEK -> {
        val daysIntoWeek = (calendar.get(Calendar.DAY_OF_WEEK) - firstDayOfWeek + 7) % 7
        calendar.add(Calendar.DAY_OF_MONTH, -daysIntoWeek)
      }
      BudgetPeriod.MONTH -> calendar.set(Calendar.DAY_OF_MONTH, 1)
    }
    return calendar.timeInMillis
  }

  // Midnight starting the period after the one containing `time`. A week
  // that began on a different first day ends at the next first day, so a
  // changed setting applies from the next week.
  fun nextPeriodStart(period: BudgetPeriod, time: Long, firstDayOfWeek: Int): Long {
    val calendar = startOfDay(periodStart(period, time, firstDayOfWeek))
    when (period) {
      BudgetPeriod.DAY -> calendar.add(Calendar.DAY_OF_MONTH, 1)
      BudgetPeriod.WEEK -> calendar.add(Calendar.DAY_OF_MONTH, 7)
      BudgetPeriod.MONTH -> calendar.add(Calendar.MONTH, 1)
    }
    return calendar.timeInMillis
  }

  fun dayStart(time: Long): Long = startOfDay(time).timeInMillis

  // Local midnight starting `dayKey` ("2026-10-15").
  fun dayStart(dayKey: String): Long {
    val parts = dayKey.split('-')
    require(parts.size == 3) { "Invalid day \"$dayKey\"" }
    return Calendar.getInstance()
      .apply {
        clear()
        set(parts[0].toInt(), parts[1].toInt() - 1, parts[2].toInt())
      }
      .timeInMillis
  }

  fun nextDayStart(time: Long): Long =
    startOfDay(time).apply { add(Calendar.DAY_OF_MONTH, 1) }.timeInMillis

  // "2026-10-15": sorts in date order, so period sums can use `day >= ?`.
  fun dayKey(time: Long): String {
    val calendar = Calendar.getInstance().apply { timeInMillis = time }
    val year = calendar.get(Calendar.YEAR)
    val month = calendar.get(Calendar.MONTH) + 1
    val day = calendar.get(Calendar.DAY_OF_MONTH)
    return buildString(10) {
      append(year)
      append('-')
      if (month < 10) append('0')
      append(month)
      append('-')
      if (day < 10) append('0')
      append(day)
    }
  }

  // Calls `block` once per local day that [from, to) touches, so time is
  // counted on the day it was spent even when a session crosses midnight.
  inline fun forEachDay(from: Long, to: Long, block: (dayKey: String, ms: Long) -> Unit) {
    var start = from
    while (start < to) {
      val end = minOf(to, nextDayStart(start))
      block(dayKey(start), end - start)
      start = end
    }
  }

  private fun startOfDay(time: Long): Calendar =
    Calendar.getInstance().apply {
      timeInMillis = time
      set(Calendar.HOUR_OF_DAY, 0)
      set(Calendar.MINUTE, 0)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }
}
