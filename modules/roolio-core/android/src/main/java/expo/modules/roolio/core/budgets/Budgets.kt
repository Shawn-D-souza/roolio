package expo.modules.roolio.core.budgets

import android.content.Context
import expo.modules.roolio.core.db.RoolioDatabase
import expo.modules.roolio.core.tracking.Notifications
import expo.modules.roolio.core.tracking.PauseEnforcer
import expo.modules.roolio.core.tracking.TrackerConfig
import expo.modules.roolio.core.tracking.TrackingService
import expo.modules.roolio.core.tracking.UsageTracker

/** A rule rejected a change. `code` is passed to JS as the error code. */
internal class BudgetException(val code: String, message: String) : RuntimeException(message)

/** What happens to borrowed time still owed when a budget changes period. */
internal enum class BorrowedChoice(val key: String) {
  // Nothing is owed anymore; future periods get their full budget back.
  CLEAR("clear"),
  // The owed minutes stay owed and come out of the new period's upcoming budgets.
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

/** An upcoming period whose budget can be borrowed from, and how much of it is already taken. */
internal data class UpcomingPeriod(val startDay: String, val budgetMs: Long, val takenMs: Long)

/** The current period of a budget, worked out to now. */
internal data class CurrentPeriod(
  val row: PeriodRow,
  val usedMs: Long,
  // The period's budget less what it paid back of earlier borrowing.
  val ownBudgetMs: Long,
  // Time left before borrowing.
  val availableMs: Long,
  // Banked time not spent yet.
  val bankedMs: Long,
  // Time used past this period's own budget and banked time.
  val borrowedMs: Long,
  // Borrowed in earlier periods and not paid back yet.
  val owedMs: Long,
  // Time that can still be borrowed under the cap.
  val borrowLeftMs: Long,
  // The periods borrowed time comes out of, nearest first: one per borrow
  // cap, or more while owed time reaches further.
  val upcoming: List<UpcomingPeriod>,
)

internal data class BudgetStatus(
  val budget: BudgetRow,
  val apps: List<BudgetAppRow>,
  val current: CurrentPeriod,
)

internal data class PastPeriod(val row: PeriodRow, val borrowedMs: Long)

/** Where an app stands against the stopping points of the pause screen. */
internal data class PauseStatus(
  val budgetId: Long,
  val periodId: Long,
  val packageName: String,
  val appName: String,
  val period: BudgetPeriod,
  val budgetMinutes: Int,
  val borrowCap: Int,
  val plan: StopPlan,
  // Start of each upcoming period that can be borrowed from, nearest first.
  val upcomingDays: List<String>,
  // When paused: the upcoming period (0 = the next) with its own time again,
  // its start, and how much time it has.
  val resumeIndex: Int,
  val resumeDay: String?,
  val resumeMs: Long,
  // While not paused: the alert due now, as the time left it warns of, and
  // the usage until the next one. Null when there is none.
  val alertDueMs: Long?,
  val nextAlertInMs: Long?,
)

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
          val used = usedSince(budget, apps, open, now, fdow)
          BudgetStatus(budget, apps, current(budget, open, used, fdow))
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
    val borrowed = store.borrowedMs(periods.map { it.id })
    return periods.map { PastPeriod(it, borrowed[it.id] ?: 0L) }
  }

  /**
   * Where `packageName`'s budget stands against its stopping points, or null
   * if it has none. Called by the pause screen from inside a tracker tick, so
   * usage is already up to date and the tracker isn't synced here.
   */
  fun pauseStatus(packageName: String, now: Long = System.currentTimeMillis()): PauseStatus? {
    val app = store.app(packageName) ?: return null
    return store.transaction {
      val budget = store.budget(app.budgetId) ?: return@transaction null
      val fdow = store.firstDayOfWeek()
      val apps = store.apps(budget.id)
      val open = rollForward(budget, apps, now, fdow)
      val settings = budget.settings
      val budgetMs = settings.budgetMinutes * MINUTE_MS
      val used = rawUsedSince(budget, apps, open, now, fdow)
      val owed = store.outstandingBorrows(budget.id).sumOf { it.outstandingMs }
      val plan =
        Stops.plan(
          ownBudgetMs = open.ownBudgetMs,
          bankedInMs = open.bankedInMs,
          budgetMs = budgetMs,
          borrowCap = settings.borrowCap,
          owedMs = owed,
          continueUntilMs = open.continueUntilMs,
          usedMs = used,
        )
      val upcomingDays = upcomingDays(settings.period, open.endDay, settings.borrowCap, fdow)
      var resumeIndex = -1
      var resumeDay: String? = null
      var resumeMs = 0L
      if (plan.paused) {
        // The ledger's view of what is taken: borrowing in whole minutes.
        val borrowed = Ledger.borrowedMs(open.ownBudgetMs, open.bankedInMs, Ledger.countedMs(used))
        val (index, left) = Stops.resume(owed + borrowed, budgetMs)
        resumeIndex = index
        resumeDay =
          upcomingDays.getOrNull(index)
            ?: upcomingDays(settings.period, open.endDay, index + 1, fdow).last()
        resumeMs = left
      }
      PauseStatus(
        budgetId = budget.id,
        periodId = open.id,
        packageName = app.packageName,
        appName = app.appName,
        period = settings.period,
        budgetMinutes = settings.budgetMinutes,
        borrowCap = settings.borrowCap,
        plan = plan,
        upcomingDays = upcomingDays,
        resumeIndex = resumeIndex,
        resumeDay = resumeDay,
        resumeMs = resumeMs,
        alertDueMs = Stops.alertDue(plan, open.alertStopMs, open.alertLeftMs),
        nextAlertInMs = Stops.nextAlertInMs(plan, open.alertStopMs, open.alertLeftMs),
      )
    }
  }

  /** Records that the alert `leftMs` before the pause at `stopAtMs` was sent, so it's sent once. */
  fun recordAlert(periodId: Long, stopAtMs: Long, leftMs: Long) {
    store.setAlert(periodId, stopAtMs, leftMs)
  }

  /**
   * Saves a choice on the pause screen: usage in period `periodId` may reach
   * `untilMs` before the next pause. It never changes the ledger. Returns
   * false when that period has ended since the screen was shown, or the
   * choice no longer keeps the app open.
   */
  fun keepGoing(
    budgetId: Long,
    periodId: Long,
    untilMs: Long,
    now: Long = System.currentTimeMillis(),
  ): Boolean =
    store.transaction {
      val budget = store.budget(budgetId) ?: return@transaction false
      val fdow = store.firstDayOfWeek()
      val apps = store.apps(budgetId)
      val open = rollForward(budget, apps, now, fdow)
      if (open.id != periodId) return@transaction false
      val settings = budget.settings
      val owed = store.outstandingBorrows(budgetId).sumOf { it.outstandingMs }
      val capEnd =
        Stops.capEndMs(
          open.ownBudgetMs,
          open.bankedInMs,
          settings.budgetMinutes * MINUTE_MS,
          settings.borrowCap,
          owed,
        )
      val until = minOf(untilMs, capEnd)
      val left = until - rawUsedSince(budget, apps, open, now, fdow)
      if (left < MIN_KEEP_GOING_MS) return@transaction false
      store.setContinueUntil(open.id, until)
      // The user just chose this much time: only alerts for less are sent.
      store.setAlert(open.id, until, left)
      true
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
      val apps = store.apps(budgetId)
      val open = rollForward(budget, apps, now, fdow)
      if (settings.period != budget.settings.period) {
        switchPeriod(budget, apps, open, settings, choice, now, fdow)
      } else {
        val ownBudgetMs = Ledger.ownBudgetMs(settings.budgetMinutes, open.repaidMs)
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
    val budgetIds =
      store.transaction {
        val budgetIds =
          packageNames
            .mapNotNull { store.app(it)?.budgetId }
            .distinct()
            .filter { store.budget(it)?.kind == BudgetKind.APP }
        store.deleteBudgets(budgetIds)
        // Apps in a group leave it; the group keeps its budget.
        store.deleteApps(packageNames)
        budgetIds
      }
    for (id in budgetIds) Notifications.cancelTimeLeft(appContext, id)
    syncTracker()
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
      val left = Ledger.availableMs(open.ownBudgetMs, open.bankedInMs, used)
      val banked = Ledger.bankedAtResetMs(left, Ledger.bankCapMs(settings.budgetMinutes, settings.rolloverCeiling))
      val endsAt = Periods.dayStart(open.endDay)
      store.closePeriod(open.id, closedAt = endsAt, usedMs = used, bankedOutMs = banked)
      // Time used past the period's own time is owed by the periods after it.
      val borrowed = Ledger.borrowedMs(open.ownBudgetMs, open.bankedInMs, used)
      if (borrowed > 0L) store.insertBorrow(budget.id, open.id, borrowed, endsAt)
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
    var repaidMs = 0L
    if (settleBorrows) {
      // Borrowed time comes out of this period's budget, oldest first.
      val owed = store.outstandingBorrows(budgetId)
      val paid = Ledger.repay(owed.map { it.outstandingMs }, settings.budgetMinutes * MINUTE_MS)
      owed.zip(paid).forEach { (borrow, amount) ->
        if (amount > 0L) store.setBorrowRepaid(borrow.id, borrow.repaidMs + amount)
      }
      repaidMs = paid.sum()
    }
    return store.insertPeriod(
      budgetId,
      settings.period,
      startDay,
      endDay,
      settings.budgetMinutes,
      repaidMs,
      bankedInMs,
      now,
    )
  }

  // The switch applies now. The current period closes, and a new one of the
  // new type opens, counting usage since its own start, so time borrowed in
  // the closing period isn't owed twice. Banked time carries over.
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
        BorrowedChoice.KEEP -> Unit
      }
    }
    val used = usedSince(budget, apps, open, now, fdow)
    val bankedLeft = Ledger.bankedLeftMs(open.ownBudgetMs, open.bankedInMs, used)
    val carried = minOf(bankedLeft, Ledger.bankCapMs(settings.budgetMinutes, settings.rolloverCeiling))
    store.closePeriod(open.id, closedAt = now, usedMs = used, bankedOutMs = carried)
    openCurrentPeriod(budget.id, settings, carried, now, fdow)
  }

  private fun current(budget: BudgetRow, open: PeriodRow, used: Long, fdow: Int): CurrentPeriod {
    val settings = budget.settings
    val ownBudgetMs = open.ownBudgetMs
    val borrowed = Ledger.borrowedMs(ownBudgetMs, open.bankedInMs, used)
    val owed = store.outstandingBorrows(budget.id).sumOf { it.outstandingMs }
    // Owed time is paid back first, so it sits in the nearest periods.
    val taken = owed + borrowed
    val budgetMs = settings.budgetMinutes * MINUTE_MS
    var startDay = open.endDay
    val upcoming =
      Ledger.upcomingTakenMs(taken, settings.budgetMinutes, settings.borrowCap, MAX_PERIOD_COUNT).map { takenMs ->
        val period = UpcomingPeriod(startDay, budgetMs, takenMs)
        startDay = Periods.dayKey(Periods.nextPeriodStart(settings.period, Periods.dayStart(startDay), fdow))
        period
      }
    return CurrentPeriod(
      row = open,
      usedMs = used,
      ownBudgetMs = ownBudgetMs,
      availableMs = Ledger.availableMs(ownBudgetMs, open.bankedInMs, used),
      bankedMs = Ledger.bankedLeftMs(ownBudgetMs, open.bankedInMs, used),
      borrowedMs = borrowed,
      owedMs = owed,
      borrowLeftMs = (Ledger.borrowCapMs(settings.budgetMinutes, settings.borrowCap) - taken).coerceAtLeast(0L),
      upcoming = upcoming,
    )
  }

  // Usage in the current period so far, in whole minutes (see [usage]).
  private fun usedSince(
    budget: BudgetRow,
    apps: List<BudgetAppRow>,
    open: PeriodRow,
    now: Long,
    fdow: Int,
  ): Long = Ledger.countedMs(rawUsedSince(budget, apps, open, now, fdow))

  // Usage in the current period so far, unrounded, for the pause screen's
  // stopping points. If the clock moved back before the period's start, the
  // period stays (no second reset) and counts usage from the start of the
  // period that contains now.
  private fun rawUsedSince(
    budget: BudgetRow,
    apps: List<BudgetAppRow>,
    open: PeriodRow,
    now: Long,
    fdow: Int,
  ): Long {
    val currentStart = Periods.dayKey(Periods.periodStart(budget.settings.period, now, fdow))
    return UsageTracker.usage(apps.map { it.packageName }, minOf(open.startDay, currentStart), null)
  }

  // Start days of the `count` periods after the one ending at `endDay`, nearest first.
  private fun upcomingDays(period: BudgetPeriod, endDay: String, count: Int, fdow: Int): List<String> {
    var start = endDay
    return List(count) {
      val day = start
      start = Periods.dayKey(Periods.nextPeriodStart(period, Periods.dayStart(start), fdow))
      day
    }
  }

  // A budget counts the time of every app it limits, in whole minutes.
  // Everything in the ledger is derived from this, so it's the one place
  // usage is rounded.
  // TODO(total-budget): the total budget covers every non-exempt app, so the
  // tracker must measure all of them before total budgets can be created.
  private fun usage(apps: List<BudgetAppRow>, fromDay: String, toDay: String?): Long =
    Ledger.countedMs(UsageTracker.usage(apps.map { it.packageName }, fromDay, toDay))

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
    // An edit can move or clear a stopping point.
    PauseEnforcer.invalidate()
  }

  /** Re-checks whether the tracking service should run, e.g. after Usage Access changed. */
  fun syncTracking() {
    UsageTracker.prepare()
    syncTracker()
  }
}
