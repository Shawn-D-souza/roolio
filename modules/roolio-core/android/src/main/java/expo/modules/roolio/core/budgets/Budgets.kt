package expo.modules.roolio.core.budgets

import android.content.Context
import expo.modules.roolio.core.db.RoolioDatabase
import expo.modules.roolio.core.tracking.TrackerConfig
import expo.modules.roolio.core.tracking.TrackingService
import expo.modules.roolio.core.tracking.UsageTracker

/** A rule rejected a change. `code` is passed to JS as the error code. */
internal class BudgetException(val code: String, message: String) : RuntimeException(message)

/** What happens to borrowed periods when a budget changes period. */
internal enum class BorrowedChoice(val key: String) {
  // Nothing is owed anymore; future periods get their full budget back.
  CLEAR("clear"),
  // The borrowed minutes stay owed and come out of the new period's upcoming budgets.
  KEEP("keep");

  companion object {
    fun from(key: String?): BorrowedChoice? =
      key?.let { value ->
        entries.firstOrNull { it.key == value }
          ?: throw BudgetException("ERR_INVALID_CHOICE", "Unknown borrowed choice \"$value\"")
      }
  }
}

internal data class NewApp(val packageName: String, val appName: String, val iconVersion: Long)

/** What the next borrow would take, e.g. "Borrow Tuesday's 60 min, 2 of 3 left". */
internal data class BorrowOffer(val targetDay: String, val amountMs: Long, val slotsLeft: Int)

/** The current period of a budget, worked out to now. */
internal data class CurrentPeriod(
  val row: PeriodRow,
  val usedMs: Long,
  val availableMs: Long,
  // Banked time not spent yet.
  val bankedMs: Long,
  // Time gained by borrowing in this period, and how much of it is left.
  val gainedMs: Long,
  val gainedLeftMs: Long,
  // Upcoming periods already borrowed, e.g. "Borrowed: 2 days ahead".
  val borrowedPeriods: Int,
  // Minutes still owed after a period change.
  val owedMs: Long,
  // Null when the borrow cap is reached or borrowing is off.
  val nextBorrow: BorrowOffer?,
)

internal data class BudgetStatus(
  val budget: BudgetRow,
  val apps: List<BudgetAppRow>,
  val current: CurrentPeriod,
)

internal data class PastPeriod(val row: PeriodRow, val gainedMs: Long)

private val MAX_BUDGET_MINUTES =
  mapOf(BudgetPeriod.DAY to 24 * 60, BudgetPeriod.WEEK to 7 * 24 * 60, BudgetPeriod.MONTH to 31 * 24 * 60)
private const val MAX_PERIOD_COUNT = 7

/**
 * The budget rules, applied to [BudgetStore].
 *
 * A reset doesn't need anything to run at midnight. Every read and write first
 * rolls each budget forward: periods that have ended are closed and the next
 * ones opened, banking leftover time. Periods are keyed by local date, so each
 * period start gets exactly one reset, even if the clock or time zone changes.
 *
 * Everything here runs on the tracker thread (see [UsageTracker.post]), which
 * serializes all reads and writes, and changes are made in one transaction.
 */
internal object Budgets {
  private lateinit var appContext: Context
  private val store by lazy { BudgetStore(RoolioDatabase.get(appContext)) }

  @Synchronized
  fun init(context: Context) {
    if (!::appContext.isInitialized) appContext = context.applicationContext
    UsageTracker.init(context)
  }

  /** Every budget with its current period. */
  fun list(now: Long = System.currentTimeMillis()): List<BudgetStatus> {
    UsageTracker.prepare()
    val statuses =
      store.transaction {
        val fdow = store.firstDayOfWeek()
        val appsByBudget = store.apps().groupBy { it.budgetId }
        store.budgets().map { budget ->
          val apps = appsByBudget[budget.id].orEmpty()
          val open = rollForward(budget, apps, now, fdow)
          BudgetStatus(budget, apps, current(budget, apps, open, now, fdow))
        }
      }
    syncTracker()
    return statuses
  }

  /** The budget that limits `packageName`, or null if it has none. */
  fun forApp(packageName: String, now: Long = System.currentTimeMillis()): BudgetStatus? {
    val budgetId = store.app(packageName)?.budgetId ?: return null
    return list(now).firstOrNull { it.budget.id == budgetId }
  }

  /** Closed periods of a budget, newest first. */
  fun history(budgetId: Long, now: Long = System.currentTimeMillis()): List<PastPeriod> {
    list(now)
    val periods = store.closedPeriods(budgetId)
    val gained = store.gainedMs(periods.map { it.id })
    return periods.map { PastPeriod(it, gained[it.id] ?: 0L) }
  }

  /** Adds a budget for one app. It applies immediately, counting time already spent. */
  fun createAppBudget(app: NewApp, settings: BudgetSettings, now: Long = System.currentTimeMillis()): Long {
    validate(settings)
    val id =
      store.transaction {
        if (store.app(app.packageName) != null) {
          throw BudgetException("ERR_ALREADY_BUDGETED", "\"${app.packageName}\" already has a budget")
        }
        val id = store.insertBudget(BudgetKind.APP, null, settings, now)
        store.insertApp(BudgetAppRow(app.packageName, id, app.appName, app.iconVersion, now))
        openCurrentPeriod(id, settings, bankedInMs = 0L, now, store.firstDayOfWeek())
        id
      }
    syncTracker()
    return id
  }

  /**
   * Saves edits to a budget. They apply immediately and never change past
   * periods. A period change needs `choice` when there are outstanding
   * borrows.
   */
  fun update(
    budgetId: Long,
    settings: BudgetSettings,
    choice: BorrowedChoice?,
    now: Long = System.currentTimeMillis(),
  ) {
    validate(settings)
    UsageTracker.prepare()
    store.transaction {
      val budget = requireBudget(budgetId)
      val fdow = store.firstDayOfWeek()
      val apps = store.apps().filter { it.budgetId == budgetId }
      val open = rollForward(budget, apps, now, fdow)
      if (settings.period != budget.settings.period) {
        switchPeriod(budget, apps, open, settings, choice, now, fdow)
      } else {
        val ownBudgetMs = Ledger.ownBudgetMs(settings.budgetMinutes, open.borrowed, open.repaidMs)
        var bankedInMs = open.bankedInMs
        // A lowered ceiling trims banked time right away.
        if (settings.rolloverCeiling < budget.settings.rolloverCeiling) {
          val used = usedSince(budget, apps, open, now, fdow)
          val bankedLeft = Ledger.bankedLeftMs(ownBudgetMs, open.bankedInMs, used)
          val cap = Ledger.bankCapMs(settings.budgetMinutes, settings.rolloverCeiling)
          bankedInMs -= (bankedLeft - cap).coerceAtLeast(0L)
        }
        store.setPeriodBudget(open.id, settings.budgetMinutes, bankedInMs)
      }
      store.updateBudget(budgetId, settings, now)
    }
    syncTracker()
  }

  /** Removes the budgets of these apps, with their history. */
  fun deleteAppBudgets(packageNames: Collection<String>) {
    if (packageNames.isEmpty()) return
    store.transaction {
      val budgetIds =
        packageNames
          .mapNotNull { store.app(it)?.budgetId }
          .distinct()
          .filter { store.budget(it)?.kind == BudgetKind.APP }
      store.deleteBudgets(budgetIds)
      // Apps in a group leave it; the group keeps its budget.
      store.deleteApps(packageNames)
    }
    syncTracker()
  }

  /**
   * Borrows the full budget of the next upcoming period not borrowed yet. Only allowed once the budget's time is used up, as on the pause
   * screen.
   */
  fun borrow(budgetId: Long, now: Long = System.currentTimeMillis()): BorrowOffer {
    UsageTracker.prepare()
    return store.transaction {
      val budget = requireBudget(budgetId)
      val fdow = store.firstDayOfWeek()
      val apps = store.apps().filter { it.budgetId == budgetId }
      val open = rollForward(budget, apps, now, fdow)
      val current = current(budget, apps, open, now, fdow)
      if (current.availableMs > 0L) {
        throw BudgetException("ERR_TIME_LEFT", "Borrowing is only offered when time is used up")
      }
      val offer =
        current.nextBorrow
          ?: throw BudgetException("ERR_NO_BORROW_SLOT", "No borrowing slot is left under the cap")
      store.insertBorrow(budgetId, open.id, offer.targetDay, offer.amountMs, now)
      offer.copy(slotsLeft = offer.slotsLeft - 1)
    }
  }

  /**
   * Sets the first day of the week. The current week keeps its end, so the
   * change applies from the next week.
   */
  fun setFirstDayOfWeek(day: Int) {
    try {
      store.setFirstDayOfWeek(day)
    } catch (error: IllegalArgumentException) {
      throw BudgetException("ERR_INVALID_SETTINGS", error.message ?: "Invalid first day of week")
    }
  }

  // Closes every period of `budget` that has ended and opens the ones after
  // it, up to the current one. Returns the current period.
  private fun rollForward(budget: BudgetRow, apps: List<BudgetAppRow>, now: Long, fdow: Int): PeriodRow {
    val settings = budget.settings
    val today = Periods.dayKey(now)
    var open =
      store.openPeriod(budget.id)
        ?: run {
          openCurrentPeriod(budget.id, settings, bankedInMs = 0L, now, fdow)
          store.openPeriod(budget.id)!!
        }
    while (open.endDay <= today) {
      val used = usage(apps, open.startDay, open.endDay)
      val gained = store.gainedMs(listOf(open.id))[open.id] ?: 0L
      val left = Ledger.availableMs(open.ownBudgetMs, open.bankedInMs, gained, used)
      val banked = Ledger.bankedAtResetMs(left, Ledger.bankCapMs(settings.budgetMinutes, settings.rolloverCeiling))
      val endsAt = Periods.dayStart(open.endDay)
      store.closePeriod(open.id, closedAt = endsAt, usedMs = used, bankedOutMs = banked)
      openPeriod(
        budget.id,
        settings,
        startDay = open.endDay,
        endDay = Periods.dayKey(Periods.nextPeriodStart(settings.period, endsAt, fdow)),
        bankedInMs = banked,
        settleBorrows = true,
        now = now,
      )
      open = store.openPeriod(budget.id)!!
    }
    return open
  }

  // Opens the period containing `now`: for a new budget, or after a period change.
  private fun openCurrentPeriod(
    budgetId: Long,
    settings: BudgetSettings,
    bankedInMs: Long,
    now: Long,
    fdow: Int,
  ): Long =
    openPeriod(
      budgetId,
      settings,
      startDay = Periods.dayKey(Periods.periodStart(settings.period, now, fdow)),
      endDay = Periods.dayKey(Periods.nextPeriodStart(settings.period, now, fdow)),
      bankedInMs = bankedInMs,
      // Owed time comes out of the periods after this one.
      settleBorrows = false,
      now = now,
    )

  private fun openPeriod(
    budgetId: Long,
    settings: BudgetSettings,
    startDay: String,
    endDay: String,
    bankedInMs: Long,
    settleBorrows: Boolean,
    now: Long,
  ): Long {
    var borrowed = false
    var repaidMs = 0L
    if (settleBorrows) {
      val outstanding = store.outstandingBorrows(budgetId)
      // A borrowed period has a budget of 0. `<=` also catches a
      // borrow whose period moved, e.g. after the first day of the week changed.
      val taken =
        outstanding
          .filter { it.targetDay != null && it.targetDay <= startDay }
          .minWithOrNull(compareBy<BorrowRow>({ it.targetDay }, { it.id }))
      if (taken != null) {
        borrowed = true
        store.setBorrowRepaid(taken.id, taken.amountMs)
      } else {
        // Minutes owed come out of this period's budget, oldest first.
        val owed = outstanding.filter { it.targetDay == null }
        val paid = Ledger.repay(owed.map { it.outstandingMs }, settings.budgetMinutes * MINUTE_MS)
        owed.zip(paid).forEach { (borrow, amount) ->
          if (amount > 0L) store.setBorrowRepaid(borrow.id, borrow.repaidMs + amount)
        }
        repaidMs = paid.sum()
      }
    }
    return store.insertPeriod(
      budgetId,
      settings.period,
      startDay,
      endDay,
      settings.budgetMinutes,
      borrowed,
      repaidMs,
      bankedInMs,
      now,
    )
  }

  // The switch applies now. The current period closes, and a new one of the
  // new type opens, counting usage since its own start. Banked time and time
  // already gained by borrowing carry over.
  private fun switchPeriod(
    budget: BudgetRow,
    apps: List<BudgetAppRow>,
    open: PeriodRow,
    settings: BudgetSettings,
    choice: BorrowedChoice?,
    now: Long,
    fdow: Int,
  ) {
    val outstanding = store.outstandingBorrows(budget.id)
    if (outstanding.isNotEmpty()) {
      when (choice) {
        null ->
          throw BudgetException(
            "ERR_BORROWED_CHOICE_REQUIRED",
            "Choose whether to clear or keep the borrowed time before changing the period",
          )
        BorrowedChoice.CLEAR -> store.clearBorrows(outstanding.map { it.id }, now)
        // Kept as a fixed number of minutes, not converted to the new period.
        BorrowedChoice.KEEP -> store.keepBorrowsAsOwed(outstanding.filter { it.targetDay != null }.map { it.id })
      }
    }
    val used = usedSince(budget, apps, open, now, fdow)
    val bankedLeft = Ledger.bankedLeftMs(open.ownBudgetMs, open.bankedInMs, used)
    val carried = minOf(bankedLeft, Ledger.bankCapMs(settings.budgetMinutes, settings.rolloverCeiling))
    store.closePeriod(open.id, closedAt = now, usedMs = used, bankedOutMs = carried)
    val nextId = openCurrentPeriod(budget.id, settings, carried, now, fdow)
    store.moveGained(open.id, nextId)
  }

  private fun current(
    budget: BudgetRow,
    apps: List<BudgetAppRow>,
    open: PeriodRow,
    now: Long,
    fdow: Int,
  ): CurrentPeriod {
    val settings = budget.settings
    val used = usedSince(budget, apps, open, now, fdow)
    val gained = store.gainedMs(listOf(open.id))[open.id] ?: 0L
    val ownBudgetMs = open.ownBudgetMs
    val outstanding = store.outstandingBorrows(budget.id)
    val borrowedPeriods = outstanding.count { it.targetDay != null }
    val owedMs = outstanding.filter { it.targetDay == null }.sumOf { it.outstandingMs }
    val slotsUsed = borrowedPeriods + Ledger.owedPeriods(owedMs, settings.budgetMinutes)
    val nextBorrow =
      if (settings.borrowCap > slotsUsed) {
        BorrowOffer(
          targetDay = nextUnborrowedDay(open, outstanding, settings.period, fdow),
          amountMs = settings.budgetMinutes * MINUTE_MS,
          slotsLeft = settings.borrowCap - slotsUsed,
        )
      } else {
        null
      }
    return CurrentPeriod(
      row = open,
      usedMs = used,
      availableMs = Ledger.availableMs(ownBudgetMs, open.bankedInMs, gained, used),
      bankedMs = Ledger.bankedLeftMs(ownBudgetMs, open.bankedInMs, used),
      gainedMs = gained,
      gainedLeftMs = Ledger.gainedLeftMs(ownBudgetMs, open.bankedInMs, gained, used),
      borrowedPeriods = borrowedPeriods,
      owedMs = owedMs,
      nextBorrow = nextBorrow,
    )
  }

  // The first upcoming period that isn't borrowed yet.
  private fun nextUnborrowedDay(
    open: PeriodRow,
    outstanding: List<BorrowRow>,
    period: BudgetPeriod,
    fdow: Int,
  ): String {
    val borrowedDays = outstanding.mapNotNullTo(HashSet()) { it.targetDay }
    var day = open.endDay
    while (day in borrowedDays) {
      day = Periods.dayKey(Periods.nextPeriodStart(period, Periods.dayStart(day), fdow))
    }
    return day
  }

  // Usage in the current period so far. If the clock moved back before the
  // period's start, the period stays (no second reset) and counts usage
  // from the start of the period that contains now.
  private fun usedSince(
    budget: BudgetRow,
    apps: List<BudgetAppRow>,
    open: PeriodRow,
    now: Long,
    fdow: Int,
  ): Long {
    val currentStart = Periods.dayKey(Periods.periodStart(budget.settings.period, now, fdow))
    return usage(apps, minOf(open.startDay, currentStart), null)
  }

  // A budget counts the time of every app it limits.
  // TODO(total-budget): the total budget covers every non-exempt app, so the
  // tracker must measure all of them before total budgets can be created.
  private fun usage(apps: List<BudgetAppRow>, fromDay: String, toDay: String?): Long =
    UsageTracker.usage(apps.map { it.packageName }, fromDay, toDay)

  private fun requireBudget(id: Long): BudgetRow =
    store.budget(id) ?: throw BudgetException("ERR_BUDGET_NOT_FOUND", "No budget with id $id")

  private fun validate(settings: BudgetSettings) {
    val max = MAX_BUDGET_MINUTES.getValue(settings.period)
    if (settings.budgetMinutes !in 1..max ||
      settings.rolloverCeiling !in 0..MAX_PERIOD_COUNT ||
      settings.borrowCap !in 0..MAX_PERIOD_COUNT
    ) {
      throw BudgetException("ERR_INVALID_SETTINGS", "Invalid budget settings $settings")
    }
  }

  // Points the tracker at the current apps and periods, and starts or stops
  // its service to match.
  private fun syncTracker() {
    UsageTracker.applyConfig(TrackerConfig.from(store))
    TrackingService.sync(appContext, store.hasApps())
  }

  /** Re-checks whether the tracking service should run, e.g. after Usage Access changed. */
  fun syncTracking() {
    UsageTracker.prepare()
    syncTracker()
  }
}
