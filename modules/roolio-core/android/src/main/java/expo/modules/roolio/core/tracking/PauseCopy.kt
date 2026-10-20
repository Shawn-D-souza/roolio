package expo.modules.roolio.core.tracking

import android.content.Context
import android.text.format.DateFormat
import expo.modules.roolio.core.R
import expo.modules.roolio.core.budgets.BudgetPeriod
import expo.modules.roolio.core.budgets.KeepGoing
import expo.modules.roolio.core.budgets.MINUTE_MS
import expo.modules.roolio.core.budgets.PauseReason
import expo.modules.roolio.core.budgets.PauseStatus
import expo.modules.roolio.core.budgets.Periods
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

/** A way to keep going on the pause screen, with its button label. */
internal data class PauseChoice(val label: String, val keepGoing: KeepGoing)

/** What the pause screen says. */
internal data class PauseScreen(
  val title: String,
  // When the app has time again; null when the borrow button says it already.
  val body: String?,
  // "Borrow 50 min from tomorrow".
  val nextPeriod: PauseChoice?,
  // "5 more minutes".
  val extra: PauseChoice?,
  // Why nothing more can be borrowed, when the borrow cap is reached.
  val note: String?,
)

// The strings that differ only by period.
private class PeriodText(val outTitle: Int, val blockedTitle: Int)

private val DAY_TEXT =
  PeriodText(
    R.string.roolio_pause_out_day,
    R.string.roolio_pause_blocked_day,
  )
private val WEEK_TEXT =
  PeriodText(
    R.string.roolio_pause_out_week,
    R.string.roolio_pause_blocked_week,
  )
private val MONTH_TEXT =
  PeriodText(
    R.string.roolio_pause_out_month,
    R.string.roolio_pause_blocked_month,
  )

/**
 * The words of the pause screen. Calm and plain: it says where the user
 * stands and what each choice does, never more.
 */
internal object PauseCopy {
  /** The screen for a paused app. */
  fun screen(context: Context, status: PauseStatus): PauseScreen {
    val res = context.resources
    val plan = status.plan
    val period = status.period
    val text =
      when (period) {
        BudgetPeriod.DAY -> DAY_TEXT
        BudgetPeriod.WEEK -> WEEK_TEXT
        BudgetPeriod.MONTH -> MONTH_TEXT
      }
    val blocked = plan.reason == PauseReason.BLOCKED

    // The title says why the app is paused; the body, when it has time again,
    // unless the borrow button names that same time.
    val title =
      when (plan.reason) {
        PauseReason.BLOCKED -> res.getString(text.blockedTitle)
        PauseReason.PERIOD_USED -> {
          val index = plan.usedPeriodIndex
          periodUsed(context, period, index, status.upcomingDays[index])
        }
        PauseReason.EXTRA_USED -> res.getString(R.string.roolio_pause_extra_title)
        PauseReason.OUT,
        null -> res.getString(text.outTitle)
      }

    val nextPeriod =
      plan.nextPeriod?.takeIf { !blocked }?.let { keepGoing ->
        val index = keepGoing.periodIndex
        val label = usePeriod(context, period, index, status.upcomingDays[index], keepGoing.amountMs)
        PauseChoice(label, keepGoing)
      }
    val body = if (nextPeriod == null) backAgain(context, status) else null
    val extra =
      plan.extra?.takeIf { !blocked }?.let { keepGoing ->
        val minutes = ceilMinutes(keepGoing.amountMs)
        PauseChoice(res.getQuantityString(R.plurals.roolio_pause_more_minutes, minutes, minutes), keepGoing)
      }
    // With borrowing off there's nothing to explain.
    val note = if (blocked && status.borrowCap > 0) res.getString(R.string.roolio_pause_borrowed_all) else null
    return PauseScreen(title, body, nextPeriod, extra, note)
  }

  // "Tomorrow's time is used", "Thursday's time is used", "Next week's time is used".
  private fun periodUsed(context: Context, period: BudgetPeriod, index: Int, startDay: String): String {
    val res = context.resources
    val offset = index + 1
    return when (period) {
      BudgetPeriod.DAY ->
        when {
          offset == 1 -> res.getString(R.string.roolio_pause_used_tomorrow)
          offset < 7 -> res.getString(R.string.roolio_pause_used_day, weekday(startDay))
          else -> res.getString(R.string.roolio_pause_used_next_day, weekday(startDay))
        }
      BudgetPeriod.WEEK ->
        if (offset == 1) {
          res.getString(R.string.roolio_pause_used_next_week)
        } else {
          res.getString(R.string.roolio_pause_used_week_of, date(startDay))
        }
      BudgetPeriod.MONTH -> res.getString(R.string.roolio_pause_used_month, month(startDay))
    }
  }

  // "Borrow 50 min from tomorrow", "Borrow 10h from next week", "Borrow 40h from November".
  private fun usePeriod(
    context: Context,
    period: BudgetPeriod,
    index: Int,
    startDay: String,
    amountMs: Long,
  ): String {
    val res = context.resources
    val amount = duration(context, ceilMinutes(amountMs))
    val offset = index + 1
    return when (period) {
      BudgetPeriod.DAY ->
        when {
          offset == 1 -> res.getString(R.string.roolio_pause_use_tomorrow, amount)
          offset < 7 -> res.getString(R.string.roolio_pause_use_day, amount, weekday(startDay))
          else -> res.getString(R.string.roolio_pause_use_next_day, amount, weekday(startDay))
        }
      BudgetPeriod.WEEK ->
        if (offset == 1) {
          res.getString(R.string.roolio_pause_use_next_week, amount)
        } else {
          res.getString(R.string.roolio_pause_use_week_of, amount, date(startDay))
        }
      BudgetPeriod.MONTH -> res.getString(R.string.roolio_pause_use_month, amount, month(startDay))
    }
  }

  // "Instagram has 1h again tomorrow."
  private fun backAgain(context: Context, status: PauseStatus): String {
    val res = context.resources
    val app = status.appName
    val amount = duration(context, ceilMinutes(status.resumeMs))
    val day = status.resumeDay ?: return res.getString(R.string.roolio_pause_back_later, app)
    val offset = status.resumeIndex + 1
    return when (status.period) {
      BudgetPeriod.DAY ->
        when {
          offset == 1 -> res.getString(R.string.roolio_pause_back_tomorrow, app, amount)
          offset < 7 -> res.getString(R.string.roolio_pause_back_on, app, amount, weekday(day))
          else -> res.getString(R.string.roolio_pause_back_on, app, amount, date(day))
        }
      BudgetPeriod.WEEK ->
        if (offset == 1) {
          res.getString(R.string.roolio_pause_back_next_week, app, amount)
        } else {
          res.getString(R.string.roolio_pause_back_week_of, app, amount, date(day))
        }
      BudgetPeriod.MONTH ->
        if (offset == 1) {
          res.getString(R.string.roolio_pause_back_next_month, app, amount)
        } else {
          res.getString(R.string.roolio_pause_back_in, app, amount, month(day))
        }
    }
  }

  // "45 min", "1h 30m", "10h": the same as the app's formatDuration.
  private fun duration(context: Context, minutes: Int): String {
    val res = context.resources
    if (minutes < 60) return res.getString(R.string.roolio_duration_minutes, minutes)
    val hours = minutes / 60
    val rest = minutes % 60
    return if (rest == 0) {
      res.getString(R.string.roolio_duration_hours, hours)
    } else {
      res.getString(R.string.roolio_duration_hours_minutes, hours, rest)
    }
  }

  // Rounded up, so a part of a minute still reads as time to use.
  private fun ceilMinutes(ms: Long): Int = ((ms + MINUTE_MS - 1) / MINUTE_MS).toInt()

  // "Tuesday".
  private fun weekday(dayKey: String): String = format(dayKey, "EEEE")

  // "Nov 2".
  private fun date(dayKey: String): String = format(dayKey, "MMMd")

  // "November", or "November 2027" outside this year.
  private fun month(dayKey: String): String {
    val start = Periods.dayStart(dayKey)
    val year = Calendar.getInstance().apply { timeInMillis = start }.get(Calendar.YEAR)
    val thisYear = Calendar.getInstance().get(Calendar.YEAR)
    return format(dayKey, if (year == thisYear) "MMMM" else "MMMMyyyy")
  }

  private fun format(dayKey: String, skeleton: String): String {
    val locale = Locale.getDefault()
    val pattern = DateFormat.getBestDateTimePattern(locale, skeleton)
    return SimpleDateFormat(pattern, locale).format(Date(Periods.dayStart(dayKey)))
  }
}
