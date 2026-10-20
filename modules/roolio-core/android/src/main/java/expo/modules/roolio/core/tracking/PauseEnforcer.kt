package expo.modules.roolio.core.tracking

import android.content.Context
import android.os.SystemClock
import android.provider.Settings
import android.util.Log
import expo.modules.roolio.core.budgets.Budgets
import expo.modules.roolio.core.budgets.KeepGoing
import expo.modules.roolio.core.budgets.PauseStatus

private const val TAG = "RoolioCore"
// The longest a budget goes unchecked while its app is on screen, or while the
// pause screen is up. Catches late-logged usage, resets and edits.
private const val RECHECK_MS = 15_000L
// How long the paused app may stay in front after being sent home before
// trying again (a blocked start, or a slow launcher).
private const val HOME_RETRY_MS = 2_000L
// A paused app can stay on screen without being in front: a small window or
// picture-in-picture, which Android gives other apps no way to close. After
// the pause screen is dismissed, the user has this long to close it
// themselves before the pause screen comes back.
private const val ON_SCREEN_RETRY_MS = 5_000L

/**
 * Pauses apps at their stopping points: sends the user home and
 * shows the pause screen ([PauseOverlay]) until they choose or dismiss it.
 *
 * Every budgeted app on screen is checked, not only the one in front: an app
 * in picture-in-picture or the other half of split screen spends its time too.
 *
 * Cheap per tick: with no budgeted app on screen it's a few set lookups. When
 * one appears, its budget is read once and the time to its next stop is kept.
 * A single app's usage grows no faster than time, so the stop can't come
 * sooner, and the budget is read again only then, every RECHECK_MS, when the
 * app comes to the front, or after an edit.
 *
 * All state lives on the tracker thread (see [UsageTracker.post]).
 */
internal object PauseEnforcer {
  private lateinit var appContext: Context

  /** The pause screen while [TrackingService] runs; null otherwise. */
  @Volatile var overlay: PauseOverlay? = null

  // When to check each budgeted app on screen again (elapsedRealtime). An app
  // that leaves the screen is dropped, so it's checked as soon as it's back.
  private val nextCheckAt = HashMap<String, Long>()
  // The app in front as of the last tick.
  private var front: String? = null
  // A budget changed: check again on the next tick.
  private var invalidated = false
  // Reused for each tick's apps to check, since checking can change the
  // tracker's set of apps on screen.
  private val candidates = ArrayList<String>(4)

  // What the pause screen is up for, and when to read its budget again.
  private var paused: PauseStatus? = null
  private var refreshAt = 0L
  private var homeSentAt = 0L

  private var overlayOffNotified = false

  @Synchronized
  fun init(context: Context) {
    if (!::appContext.isInitialized) appContext = context.applicationContext
  }

  /** Re-reads budgets on the next tick, e.g. after an edit. */
  fun invalidate() {
    invalidated = true
  }

  /** Called on every tick, after usage is up to date. */
  fun onTick(foreground: String?, visible: Set<String>, tracked: Set<String>) {
    val elapsed = SystemClock.elapsedRealtime()
    // An app that comes to the front is checked at once.
    if (foreground != front) {
      front = foreground
      foreground?.let(nextCheckAt::remove)
    }

    paused?.let { shown ->
      // The home screen it sent the user to, and the notification shade, keep
      // the pause screen up. (Pressing Home or Recents closes it: see
      // PauseOverlay.)
      val stays =
        foreground == null ||
          foreground == shown.packageName ||
          SystemApps.keepsPause(appContext, foreground)
      if (stays) {
        if (foreground == shown.packageName && elapsed - homeSentAt >= HOME_RETRY_MS) {
          homeSentAt = elapsed
          overlay?.goHome()
        }
        if (invalidated || elapsed >= refreshAt) refresh(shown, elapsed, force = false)
        return
      }
      // Another app came to the front (a call, a notification, Roolio): that
      // closes the pause screen, so it never covers them.
      dismiss()
      holdOff(shown.packageName, inFront = false, visible, elapsed)
    }

    // A call, Settings or Roolio itself is never interrupted, not even for an
    // app in picture-in-picture over it.
    if (
      foreground != null &&
        SystemApps.isExempt(appContext, foreground) &&
        !SystemApps.keepsPause(appContext, foreground)
    ) {
      nextCheckAt.clear()
      return
    }

    nextCheckAt.keys.retainAll(visible)
    val due = invalidated
    invalidated = false
    // The app in front first: going home is what closes it.
    candidates.clear()
    if (foreground != null && foreground in visible) candidates += foreground
    for (packageName in visible) if (packageName != foreground) candidates += packageName
    for (packageName in candidates) {
      if (packageName !in tracked || SystemApps.isExempt(appContext, packageName)) continue
      if (!due && elapsed < (nextCheckAt[packageName] ?: 0L)) continue
      check(packageName, inFront = packageName == foreground, elapsed)
      if (paused != null) break
    }
    candidates.clear()
  }

  /** Takes the pause screen down without a choice: the screen turned off, or tracking stopped. */
  fun reset() {
    dismiss()
    nextCheckAt.clear()
    front = null
  }

  /** "Close app". */
  fun onClose() {
    val shown = paused ?: return
    paused = null
    val inFront = UsageTracker.foregroundPackage == shown.packageName
    holdOff(shown.packageName, inFront, UsageTracker.visiblePackages, SystemClock.elapsedRealtime())
    overlay?.close(goHome = inFront)
  }

  /** "5 more minutes" or "Use Tuesday's time": saved, then the app opens again. */
  fun onKeepGoing(keepGoing: KeepGoing) {
    val shown = paused ?: return
    if (Budgets.keepGoing(shown.budgetId, shown.periodId, keepGoing.untilMs)) {
      paused = null
      nextCheckAt.remove(shown.packageName)
      overlay?.resume(shown.packageName)
    } else {
      // The period ended, or the budget changed: show what's possible now.
      refresh(shown, SystemClock.elapsedRealtime(), force = true)
    }
  }

  /**
   * The pause screen couldn't be shown. The app's next check is kept, so it's
   * tried again then rather than on every tick.
   */
  fun onShowFailed() {
    if (paused == null) return
    paused = null
    if (!Settings.canDrawOverlays(appContext)) notifyOverlayOff()
  }

  /**
   * Called with the access checks. Without Display over other apps, budgets
   * aren't enforced, and the user is told once.
   */
  fun checkOverlayAccess() {
    if (Settings.canDrawOverlays(appContext)) {
      if (overlayOffNotified) {
        overlayOffNotified = false
        Notifications.cancelOverlayOff(appContext)
      }
      return
    }
    // Android removes the window itself when the permission goes.
    if (paused != null) dismiss()
    notifyOverlayOff()
  }

  private fun check(packageName: String, inFront: Boolean, elapsed: Long) {
    val status = Budgets.pauseStatus(packageName)
    if (status == null || !status.plan.paused) {
      nextCheckAt[packageName] = elapsed + minOf(status?.plan?.remainingMs ?: RECHECK_MS, RECHECK_MS)
      return
    }
    nextCheckAt[packageName] = elapsed + RECHECK_MS
    val overlay = overlay
    if (overlay == null || !Settings.canDrawOverlays(appContext)) {
      notifyOverlayOff()
      return
    }
    Log.i(TAG, "Pausing $packageName (${status.plan.reason})")
    paused = status
    refreshAt = elapsed + RECHECK_MS
    homeSentAt = elapsed
    overlay.show(status, inFront)
  }

  private fun refresh(shown: PauseStatus, elapsed: Long, force: Boolean) {
    invalidated = false
    refreshAt = elapsed + RECHECK_MS
    val status = Budgets.pauseStatus(shown.packageName)
    if (status == null || !status.plan.paused) {
      // A reset or an edit gave the app time again.
      dismiss()
      return
    }
    if (!force && status == shown) return
    paused = status
    overlay?.update(status)
  }

  private fun dismiss() {
    paused?.let { nextCheckAt.remove(it.packageName) }
    paused = null
    overlay?.hide()
  }

  // After the pause screen goes without a choice, a paused app still on screen
  // but not in front (a small window or picture-in-picture) is paused again
  // after ON_SCREEN_RETRY_MS, unless the user closes it first. One in front
  // is checked again at once.
  private fun holdOff(packageName: String, inFront: Boolean, visible: Set<String>, elapsed: Long) {
    if (!inFront && packageName in visible) {
      nextCheckAt[packageName] = elapsed + ON_SCREEN_RETRY_MS
    } else {
      nextCheckAt.remove(packageName)
    }
  }

  private fun notifyOverlayOff() {
    if (overlayOffNotified) return
    overlayOffNotified = true
    Notifications.showOverlayOff(appContext)
  }
}
