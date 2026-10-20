package expo.modules.roolio.core.budgets

// "5 more minutes" on the pause screen.
internal const val EXTRA_MS = 5 * MINUTE_MS
// A way to keep going shorter than this isn't offered: it would end as it starts.
internal const val MIN_KEEP_GOING_MS = 1_000L
// Alerts before each pause, by time left, the earliest first.
internal const val FIRST_ALERT_LEFT_MS = 5 * MINUTE_MS
private val ALERT_LEFT_MS = longArrayOf(FIRST_ALERT_LEFT_MS, MINUTE_MS)

/** Why an app is paused. */
internal enum class PauseReason {
  // The period's own budget and banked time are used.
  OUT,
  // The upcoming period the user chose to borrow from is used.
  PERIOD_USED,
  // The extra minutes the user chose are used.
  EXTRA_USED,
  // Nothing more can be borrowed: the borrow cap is reached, or borrowing is off.
  BLOCKED,
}

/** A choice on the pause screen: keep going until usage this period reaches `untilMs`. */
internal data class KeepGoing(
  val untilMs: Long,
  // How long that is from now.
  val amountMs: Long,
  // The upcoming period it uses up, nearest first, or -1 for extra minutes.
  val periodIndex: Int,
)

/** Where a budget's usage stands against its stopping points. */
internal data class StopPlan(
  val usedMs: Long,
  // The next stopping point: usage at which the app is paused.
  val stopAtMs: Long,
  // Usage at which nothing more can be borrowed.
  val capEndMs: Long,
  // Null while the app may still be used.
  val reason: PauseReason?,
  // For PERIOD_USED, the upcoming period whose time ran out; else -1.
  val usedPeriodIndex: Int,
  // "Borrow 50 min from tomorrow": up to the end of the nearest period with time left.
  val nextPeriod: KeepGoing?,
  // "5 more minutes", or fewer near the cap.
  val extra: KeepGoing?,
) {
  val paused: Boolean
    get() = reason != null

  /** Usage left before the next stop; 0 once paused. */
  val remainingMs: Long
    get() = (stopAtMs - usedMs).coerceAtLeast(0L)
}

/**
 * The stopping points of the pause screen, kept free of storage so
 * it can be unit tested. All amounts are ms of usage in the current period.
 *
 * Usage is compared unrounded, so a stop lands on the second. The ledger counts
 * whole minutes, and every stopping point but extra minutes is a whole minute,
 * so both agree on when time runs out.
 *
 * The stops are: when available time reaches zero; then at the end of each
 * upcoming period's budget, nearest first, up to the borrow cap; and wherever
 * the user's last choice ends. Borrowing time owed from earlier periods sits
 * in the nearest periods, so a period it fully takes is skipped.
 */
internal object Stops {
  fun plan(
    ownBudgetMs: Long,
    bankedInMs: Long,
    budgetMs: Long,
    borrowCap: Int,
    owedMs: Long,
    continueUntilMs: Long?,
    usedMs: Long,
  ): StopPlan {
    val availableEnd = ownBudgetMs + bankedInMs
    val capEnd = capEndMs(ownBudgetMs, bankedInMs, budgetMs, borrowCap, owedMs)
    // A choice keeps its place across edits, within what the budget allows now.
    val stopAt = (continueUntilMs ?: availableEnd).coerceIn(availableEnd, capEnd)

    if (usedMs < stopAt) {
      return StopPlan(usedMs, stopAt, capEnd, null, -1, null, null)
    }

    var nextPeriod: KeepGoing? = null
    var usedPeriodIndex = -1
    for (index in 0 until borrowCap) {
      val end = periodEnd(availableEnd, budgetMs, owedMs, index)
      if (end <= availableEnd) continue
      if (end == stopAt) usedPeriodIndex = index
      if (end - usedMs < MIN_KEEP_GOING_MS) continue
      if (nextPeriod == null) nextPeriod = KeepGoing(end, end - usedMs, index)
    }
    val extraUntil = minOf(usedMs + EXTRA_MS, capEnd)
    val extra =
      KeepGoing(extraUntil, extraUntil - usedMs, -1).takeIf {
        it.amountMs >= MIN_KEEP_GOING_MS && it.untilMs != nextPeriod?.untilMs
      }

    val reason =
      when {
        nextPeriod == null && extra == null -> PauseReason.BLOCKED
        stopAt == availableEnd -> PauseReason.OUT
        usedPeriodIndex >= 0 -> PauseReason.PERIOD_USED
        else -> PauseReason.EXTRA_USED
      }
    return StopPlan(
      usedMs = usedMs,
      stopAtMs = stopAt,
      capEndMs = capEnd,
      reason = reason,
      usedPeriodIndex = if (reason == PauseReason.PERIOD_USED) usedPeriodIndex else -1,
      nextPeriod = nextPeriod,
      extra = extra,
    )
  }

  /**
   * Usage at which nothing more can be borrowed: available time plus what the
   * borrow cap still allows after time owed from earlier periods.
   */
  fun capEndMs(ownBudgetMs: Long, bankedInMs: Long, budgetMs: Long, borrowCap: Int, owedMs: Long): Long =
    ownBudgetMs + bankedInMs + (budgetMs * borrowCap - owedMs).coerceAtLeast(0L)

  /**
   * When a blocked budget has its own time again: the upcoming period (0 =
   * the next) whose budget isn't fully taken by `takenMs` of borrowing, and
   * how much of its budget is left.
   */
  fun resume(takenMs: Long, budgetMs: Long): Pair<Int, Long> {
    val taken = takenMs.coerceAtLeast(0L)
    return (taken / budgetMs).toInt() to budgetMs - taken % budgetMs
  }

  /**
   * The alert due before the next pause, as the time left it warns of, or
   * null. `alertStopMs` and `alertLeftMs` are the last alert sent: each
   * stopping point gets each alert once. When several are due at once (the
   * app came on screen with 30 s left), only the latest is sent.
   */
  fun alertDue(plan: StopPlan, alertStopMs: Long?, alertLeftMs: Long?): Long? {
    if (plan.paused) return null
    val due = ALERT_LEFT_MS.lastOrNull { plan.remainingMs <= it } ?: return null
    val sent = alertLeftMs.takeIf { alertStopMs == plan.stopAtMs } ?: return due
    return due.takeIf { it < sent }
  }

  /** Usage until the next alert before this pause is due, or null if none is left. */
  fun nextAlertInMs(plan: StopPlan, alertStopMs: Long?, alertLeftMs: Long?): Long? {
    if (plan.paused) return null
    val sent = alertLeftMs.takeIf { alertStopMs == plan.stopAtMs } ?: Long.MAX_VALUE
    val next = ALERT_LEFT_MS.firstOrNull { it < sent && plan.remainingMs > it } ?: return null
    return plan.remainingMs - next
  }

  // Usage at which upcoming period `index` is used up.
  private fun periodEnd(availableEnd: Long, budgetMs: Long, owedMs: Long, index: Int): Long =
    availableEnd + (index + 1) * budgetMs - owedMs
}
