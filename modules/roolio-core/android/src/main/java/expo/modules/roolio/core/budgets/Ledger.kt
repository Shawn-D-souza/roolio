package expo.modules.roolio.core.budgets

internal const val MINUTE_MS = 60_000L

/**
 * Budget arithmetic, kept free of storage so it can be unit tested.
 * All amounts are ms.
 *
 * Within a period, time is spent from the period's own budget first, then
 * banked time, then time gained by borrowing, which is only offered once
 * the other two are gone.
 */
internal object Ledger {
  /** The period's own budget: 0 if it was borrowed, less any minutes owed it repays. */
  fun ownBudgetMs(budgetMinutes: Int, borrowed: Boolean, repaidMs: Long): Long =
    if (borrowed) 0L else (budgetMinutes * MINUTE_MS - repaidMs).coerceAtLeast(0L)

  /** Time still available in the period, never below 0. */
  fun availableMs(ownBudgetMs: Long, bankedInMs: Long, gainedMs: Long, usedMs: Long): Long =
    (ownBudgetMs + bankedInMs + gainedMs - usedMs).coerceAtLeast(0L)

  /** Banked time not spent yet. */
  fun bankedLeftMs(ownBudgetMs: Long, bankedInMs: Long, usedMs: Long): Long =
    (bankedInMs - (usedMs - ownBudgetMs).coerceAtLeast(0L)).coerceIn(0L, bankedInMs)

  /** Time gained by borrowing that is not spent yet. */
  fun gainedLeftMs(ownBudgetMs: Long, bankedInMs: Long, gainedMs: Long, usedMs: Long): Long =
    (gainedMs - (usedMs - ownBudgetMs - bankedInMs).coerceAtLeast(0L)).coerceIn(0L, gainedMs)

  /** The most banked time a budget can hold. */
  fun bankCapMs(budgetMinutes: Int, rolloverCeiling: Int): Long =
    budgetMinutes * MINUTE_MS * rolloverCeiling

  /**
   * Time banked at reset: everything left in the period, including unused
   * borrowed time, up to the cap. The rest is lost.
   */
  fun bankedAtResetMs(availableMs: Long, capMs: Long): Long = minOf(availableMs, capMs)

  /**
   * Minutes owed after a period change, as the number of upcoming periods they
   * take from. These count against the borrow cap like borrowed periods.
   */
  fun owedPeriods(owedMs: Long, budgetMinutes: Int): Int {
    if (owedMs <= 0L) return 0
    val budgetMs = budgetMinutes * MINUTE_MS
    return ((owedMs + budgetMs - 1) / budgetMs).toInt()
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
