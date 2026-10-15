package expo.modules.roolio.usage

import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.database.SQLException
import android.os.Handler
import android.os.HandlerThread
import android.os.Process
import android.os.SystemClock
import android.util.Log

private const val TAG = "RoolioUsage"

// How often to read new events while the screen is on.
private const val TICK_MS = 1_000L
// How often to save time from a session that is still going.
private const val FLUSH_MS = 60_000L
private const val ACCESS_CHECK_MS = 30_000L
// Even with nothing to save, move the checkpoint up so a restart replays less.
private const val CHECKPOINT_MAX_AGE_MS = 10 * 60_000L
// Android stamps an event when it happens but logs it a moment later, and the
// delay is longest while an app is launching. Events newer than this may still
// be on their way, so that window is re-read on every tick instead of being
// treated as final.
private const val SETTLE_MS = 10_000L
private const val DAY_MS = 24 * 60 * 60_000L
// How far before a backfill's start to read, to find a session already open then.
private const val BACKFILL_LOOKBACK_MS = 6 * 60 * 60_000L

private typealias DailyDeltas = HashMap<String, HashMap<String, Long>>

/**
 * Measures visible time of the tracked apps from UsageStats events (see
 * [Visibility] for what counts).
 *
 * Time comes from event timestamps, not from counting ticks. Polling only makes
 * Roolio find out sooner: a late poll or a killed process loses no time, because
 * events are read again from the saved checkpoint.
 *
 * Events are split at a "settled" line SETTLE_MS before now. Events before it
 * are final: they're counted into `pending` and saved. The tail after it is
 * re-read on every tick and only counted on the fly, so an event logged late
 * still gets counted, and readings stay up to the second.
 *
 * All state lives on one background thread. Every entry point runs on it via
 * [post], so nothing here needs locks.
 */
internal object UsageTracker {
  private val handler: Handler by lazy {
    val thread = HandlerThread(TAG, Process.THREAD_PRIORITY_BACKGROUND)
    thread.start()
    Handler(thread.looper)
  }

  private lateinit var appContext: Context
  private val store by lazy { UsageStore(appContext) }
  private val usageStats by lazy {
    appContext.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
  }
  // Reused for every event read, so ticking allocates almost nothing.
  private val event = UsageEvents.Event()

  private var loaded = false
  private var config = TrackerConfig.EMPTY

  // Settled state: events before `settledUntil` are final and processed.
  private var settledUntil = 0L
  // Each app's `since` is the start of its time not yet added to `pending`.
  private val settled =
    Visibility { packageName, from, to ->
      if (packageName in config.packages) {
        addTime(pending, packageName, from, to)
        sessionEnded = true
      }
    }
  private val pending = DailyDeltas()
  private var sessionEnded = false
  private var savedCheckpoint = 0L

  // Provisional state from `settledUntil` to `tailEnd`, rebuilt on every catch-up.
  private val tailTime = HashMap<String, Long>()
  private val tail =
    Visibility { packageName, from, to ->
      if (packageName in config.packages) {
        tailTime[packageName] = (tailTime[packageName] ?: 0L) + (to - from)
      }
    }
  private var tailEnd = 0L

  private var ticking = false
  private var lastFlushAt = 0L
  private var lastAccessCheckAt = 0L

  /** Called on the tracker thread when Usage Access turns out to be off. */
  @Volatile var onAccessLost: (() -> Unit)? = null

  /** The app the user is interacting with as of the last tick, or null (e.g. screen off). */
  @Volatile var foregroundPackage: String? = null
    private set

  @Synchronized
  fun init(context: Context) {
    if (!::appContext.isInitialized) appContext = context.applicationContext
  }

  fun post(block: () -> Unit) {
    handler.post(block)
  }

  /** Reads events every second until [stopTicking]. Call only while the screen is on. */
  fun startTicking() = post {
    if (ticking) return@post
    ensureLoaded()
    ticking = true
    // Check access on the first tick, since it may have changed while the screen was off.
    lastAccessCheckAt = 0L
    handler.post(tick)
  }

  /** Stops all work and saves what was measured. */
  fun stopTicking() = post {
    ticking = false
    handler.removeCallbacks(tick)
    if (!loaded) return@post
    guard {
      catchUp()
      flush(force = true)
    }
  }

  /** Replaces the tracked apps. Runs on the tracker thread (see [post]). */
  fun applyConfig(next: TrackerConfig) {
    ensureLoaded()
    catchUp()
    if (next == config) return

    // Save everything counted under the old config, so a later replay from the
    // checkpoint can't count a newly tracked app's backfilled time again.
    flush(force = true)
    store.deletePackages(config.packages - next.packages)
    config = next
    next.save(appContext)

    val now = System.currentTimeMillis()
    for (app in next.apps) backfillIfNeeded(app, now)
    // Count the unsettled tail for the new apps too.
    catchUp()
  }

  /** Visible ms per tracked app in its current period. Runs on the tracker thread. */
  fun periodUsage(): Map<String, Long> {
    ensureLoaded()
    catchUp()
    flush(force = false)
    val now = System.currentTimeMillis()
    val usage = HashMap<String, Long>(config.apps.size)
    for (app in config.apps) {
      val packageName = app.packageName
      val start = Periods.periodStart(app.period, now, config.firstDayOfWeek)
      val fromDay = Periods.dayKey(start)
      var total = store.sumSince(packageName, fromDay)
      // Time not saved yet, if the last save failed.
      for ((day, byPackage) in pending) {
        if (day >= fromDay) total += byPackage[packageName] ?: 0L
      }
      settled.since(packageName)?.let { since ->
        total += (settledUntil - maxOf(since, start)).coerceAtLeast(0L)
      }
      total += tailTime[packageName] ?: 0L
      tail.since(packageName)?.let { since ->
        total += (tailEnd - maxOf(since, start)).coerceAtLeast(0L)
      }
      usage[packageName] = total
    }
    return usage
  }

  private val tick =
    object : Runnable {
      override fun run() {
        if (!ticking) return
        guard {
          val elapsed = SystemClock.elapsedRealtime()
          if (elapsed - lastAccessCheckAt >= ACCESS_CHECK_MS) {
            lastAccessCheckAt = elapsed
            if (!UsageAccess.isGranted(appContext)) {
              ticking = false
              flush(force = true)
              onAccessLost?.invoke()
              return@guard
            }
          }
          catchUp()
          if (sessionEnded || elapsed - lastFlushAt >= FLUSH_MS) flush(force = false)
        }
        if (ticking) handler.postDelayed(this, TICK_MS)
      }
    }

  private fun ensureLoaded() {
    if (loaded) return
    config = TrackerConfig.load(appContext)
    val now = System.currentTimeMillis()
    val state = store.readState()
    if (state != null && state.checkpoint <= now) {
      settledUntil = state.checkpoint
      settled.restore(state.visible)
      savedCheckpoint = state.checkpoint
    } else {
      settledUntil = now
    }
    tail.copyFrom(settled, settledUntil)
    tailEnd = settledUntil
    loaded = true
    // Recounts any app whose history is missing, e.g. after a store upgrade.
    for (app in config.apps) backfillIfNeeded(app, now)
  }

  // Reads every event since the settled line: older ones become final, the
  // rest rebuild the tail.
  private fun catchUp() {
    val now = System.currentTimeMillis()
    if (now < settledUntil) {
      // The clock moved back. Restart from the new time without counting the gap.
      settledUntil = now
      settled.clampSince(now)
      tailTime.clear()
      tail.copyFrom(settled, now)
      tailEnd = now
      foregroundPackage = tail.focused
      return
    }
    val settleAt = maxOf(settledUntil, now - SETTLE_MS)

    val events =
      try {
        usageStats.queryEvents(settledUntil, now)
      } catch (ignored: SecurityException) {
        null
      }
    var inTail = false
    tailTime.clear()
    if (events != null) {
      while (events.hasNextEvent()) {
        events.getNextEvent(event)
        val time = event.timeStamp
        if (!inTail && time >= settleAt) {
          tail.copyFrom(settled, settleAt)
          inTail = true
        }
        val state = if (inTail) tail else settled
        state.apply(event.eventType, event.packageName, event.className, time)
      }
    }
    if (!inTail) tail.copyFrom(settled, settleAt)
    settledUntil = settleAt
    tailEnd = now
    foregroundPackage = tail.focused
  }

  /**
   * Saves pending time with the checkpoint. Skips the disk write when there is
   * nothing to save, unless `force`.
   */
  private fun flush(force: Boolean) {
    lastFlushAt = SystemClock.elapsedRealtime()
    for (packageName in settled.packages) {
      if (packageName !in config.packages) continue
      val since = settled.since(packageName) ?: continue
      if (settledUntil > since) {
        addTime(pending, packageName, since, settledUntil)
        settled.markCounted(packageName, settledUntil)
      }
    }
    val checkpointIsStale = settledUntil - savedCheckpoint >= CHECKPOINT_MAX_AGE_MS
    if (!force && pending.isEmpty() && !checkpointIsStale) return

    try {
      store.commit(pending, TrackerState(settledUntil, settled.toJson()))
    } catch (error: SQLException) {
      // Keep `pending` and try again on the next flush.
      Log.w(TAG, "Couldn't save usage", error)
      return
    }
    pending.clear()
    sessionEnded = false
    savedCheckpoint = settledUntil
  }

  // Adds the app's usage from the start of its period to when live counting
  // began, so time already spent counts against a new budget (PRD §7).
  private fun backfillIfNeeded(app: TrackedApp, now: Long) {
    val start = Periods.periodStart(app.period, now, config.firstDayOfWeek)
    val coveredFrom = store.coveredFrom(app.packageName)
    if (coveredFrom != null && coveredFrom <= start) return
    val end = coveredFrom ?: settled.since(app.packageName) ?: settledUntil
    store.commitBackfill(app.packageName, measure(app.packageName, start, end), start)
  }

  // Visible time of one app in [from, to), straight from the system's history.
  private fun measure(packageName: String, from: Long, to: Long): DailyDeltas {
    val deltas = DailyDeltas()
    if (to <= from) return deltas
    // Start reading a little earlier, so a session already open at `from`
    // (e.g. across midnight) is known and counted from `from`.
    val events =
      try {
        usageStats.queryEvents(from - BACKFILL_LOOKBACK_MS, to)
      } catch (ignored: SecurityException) {
        null
      } ?: return deltas

    val visibility =
      Visibility { ended, start, end ->
        if (ended == packageName && end > from) {
          addTime(deltas, packageName, maxOf(start, from), end)
        }
      }
    var firstEventAt = -1L
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (firstEventAt < 0) firstEventAt = event.timeStamp
      visibility.apply(event.eventType, event.packageName, event.className, event.timeStamp)
    }
    visibility.endAll(to)

    // Android keeps only about a week of events. Days before the oldest event
    // fall back to the system's daily totals, counted on the period's first day.
    if (firstEventAt > 0 && firstEventAt - from > DAY_MS) {
      val olderEnd = Periods.dayStart(firstEventAt)
      val older =
        try {
          usageStats.queryAndAggregateUsageStats(from, olderEnd)[packageName]?.totalTimeInForeground
        } catch (ignored: SecurityException) {
          null
        }
      if (older != null && older > 0) {
        val byPackage = deltas.getOrPut(Periods.dayKey(from)) { HashMap() }
        byPackage[packageName] =
          (byPackage[packageName] ?: 0L) + older.coerceAtMost(olderEnd - from)
      }
    }
    return deltas
  }

  private fun addTime(deltas: DailyDeltas, packageName: String, from: Long, to: Long) {
    Periods.forEachDay(from, to) { day, ms ->
      val byPackage = deltas.getOrPut(day) { HashMap() }
      byPackage[packageName] = (byPackage[packageName] ?: 0L) + ms
    }
  }

  // The tracker runs in Roolio's process, so a failure here must never crash the app.
  private inline fun guard(block: () -> Unit) {
    try {
      block()
    } catch (error: RuntimeException) {
      Log.e(TAG, "Usage tracking failed", error)
    }
  }
}
