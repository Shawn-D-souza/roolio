package expo.modules.roolio.core.budgets

internal const val MINUTE_MS = 60_000L

/**
 * Budget arithmetic, kept free of storage so it can be unit tested.
 * All amounts are ms.
 *
 * Within a period, time is spent from the period's own budget first, then
 * banked time, then borrowed time: the budgets of upcoming periods, nearest
 * first. Borrowed time is counted as it is used, and paid back from the own
 * budgets of the periods after this one.
 */
internal object Ledger {
  /**
   * Usage as the ledger counts it: whole minutes, rounded down.
   * Every amount derived from it is then a whole number of minutes, so the
   * numbers shown always add up.
   */
  fun countedMs(usedMs: Long): Long = usedMs - usedMs % MINUTE_MS

  /** The period's own budget: less any minutes borrowed earlier that it pays back. */
  fun ownBudgetMs(budgetMinutes: Int, repaidMs: Long): Long =
    (budgetMinutes * MINUTE_MS - repaidMs).coerceAtLeast(0L)

  /** Time still available in the period before borrowing, never below 0. */
  fun availableMs(ownBudgetMs: Long, bankedInMs: Long, usedMs: Long): Long =
    (ownBudgetMs + bankedInMs - usedMs).coerceAtLeast(0L)

  /** Banked time not spent yet. */
  fun bankedLeftMs(ownBudgetMs: Long, bankedInMs: Long, usedMs: Long): Long =
    (bankedInMs - (usedMs - ownBudgetMs).coerceAtLeast(0L)).coerceIn(0L, bankedInMs)

  /** Time used past the period's own budget and banked time. */
  fun borrowedMs(ownBudgetMs: Long, bankedInMs: Long, usedMs: Long): Long =
    (usedMs - ownBudgetMs - bankedInMs).coerceAtLeast(0L)

  /** The most banked time a budget can hold. */
  fun bankCapMs(budgetMinutes: Int, rolloverCeiling: Int): Long =
    budgetMinutes * MINUTE_MS * rolloverCeiling

  /** The most borrowed time a budget can owe at once. */
  fun borrowCapMs(budgetMinutes: Int, borrowCap: Int): Long =
    budgetMinutes * MINUTE_MS * borrowCap

  /** Time banked at reset: everything left in the period, up to the cap. The rest is lost. */
  fun bankedAtResetMs(availableMs: Long, capMs: Long): Long = minOf(availableMs, capMs)

  /**
   * How much of each upcoming period's budget is already taken, nearest
   * first, when `takenMs` is owed in total. Covers at least `count` periods,
   * and more if needed to show everything owed, up to `maxCount`.
   */
  fun upcomingTakenMs(takenMs: Long, budgetMinutes: Int, count: Int, maxCount: Int): List<Long> {
    val budgetMs = budgetMinutes * MINUTE_MS
    val needed = if (takenMs <= 0L) 0 else ((takenMs + budgetMs - 1) / budgetMs).toInt()
    return List(maxOf(count, needed).coerceAtMost(maxCount)) { index ->
      (takenMs - index * budgetMs).coerceIn(0L, budgetMs)
    }
  }

  /** Splits `amountMs` across outstanding debts, oldest first. Returns how much each repays. */
  fun repay(outstandingMs: List<Long>, amountMs: Long): List<Long> {
    var left = amountMs.coerceAtLeast(0L)
    return outstandingMs.map { owed ->
      val paid = minOf(owed.coerceAtLeast(0L), left)
      left -= paid
      paid
    }
  }
}
