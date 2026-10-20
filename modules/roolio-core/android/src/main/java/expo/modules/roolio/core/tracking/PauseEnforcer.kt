package expo.modules.roolio.core.tracking

import android.content.Context
import android.os.SystemClock
import android.provider.Settings
import android.util.Log
import expo.modules.roolio.core.budgets.Budgets
import expo.modules.roolio.core.budgets.KeepGoing
import expo.modules.roolio.core.budgets.PauseStatus

private const val TAG = "RoolioCore"
// The longest a budget goes unchecked while its app is in front, or while the
// pause screen is up. Catches late-logged usage, resets and edits.
private const val RECHECK_MS = 15_000L
// How long the paused app may stay in front after being sent home before
// trying again (a blocked start, or a slow launcher).
private const val HOME_RETRY_MS = 2_000L

/**
 * Pauses apps at their stopping points: sends the user home and
 * shows the pause screen ([PauseOverlay]) until they choose or dismiss it.
 *
 * Cheap per tick: with no budgeted app in front it's one set lookup. When one
 * comes to the front, its budget is read once and the time to its next stop
 * is kept. A single app's usage grows no faster than time, so the stop can't
 * come sooner, and the budget is read again only then, every RECHECK_MS, when
 * the app in front changes, or after an edit.
 *
 * All state lives on the tracker thread (see [UsageTracker.post]).
 */
internal object PauseEnforcer {
  private lateinit var appContext: Context

  /** The pause screen while [TrackingService] runs; null otherwise. */
  @Volatile var overlay: PauseOverlay? = null

  // The budgeted app last checked in front, and when to check it again
  // (elapsedRealtime).
  private var checked: String? = null
  private var nextCheckAt = 0L
  // A budget changed: check again on the next tick.
  private var invalidated = false

  // What the pause screen is up for.
  private var paused: PauseStatus? = null
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
  fun onTick(foreground: String?, tracked: Set<String>) {
    val elapsed = SystemClock.elapsedRealtime()
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
        if (invalidated || elapsed >= nextCheckAt) refresh(shown, elapsed, force = false)
        return
      }
      // Another app came to the front (a call, a notification, Roolio): that
      // closes the pause screen, so it never covers them.
      dismiss()
    }

    if (foreground == null || foreground !in tracked || SystemApps.isExempt(appContext, foreground)) {
      checked = null
      return
    }
    if (foreground == checked && !invalidated && elapsed < nextCheckAt) return
    check(foreground, elapsed)
  }

  /** Takes the pause screen down without a choice: the screen turned off, or tracking stopped. */
  fun reset() {
    dismiss()
    nextCheckAt = 0L
  }

  /** "Close app". */
  fun onClose() {
    val shown = paused ?: return
    paused = null
    checked = null
    overlay?.close(goHome = UsageTracker.foregroundPackage == shown.packageName)
  }

  /** "5 more minutes" or "Use Tuesday's time": saved, then the app opens again. */
  fun onKeepGoing(keepGoing: KeepGoing) {
    val shown = paused ?: return
    if (Budgets.keepGoing(shown.budgetId, shown.periodId, keepGoing.untilMs)) {
      paused = null
      checked = null
      overlay?.resume(shown.packageName)
    } else {
      // The period ended, or the budget changed: show what's possible now.
      refresh(shown, SystemClock.elapsedRealtime(), force = true)
    }
  }

  /**
   * The pause screen couldn't be shown. `checked` is kept, so the app is tried
   * again at `nextCheckAt` rather than on every tick.
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

  private fun check(packageName: String, elapsed: Long) {
    invalidated = false
    checked = packageName
    val status = Budgets.pauseStatus(packageName)
    if (status == null || !status.plan.paused) {
      nextCheckAt = elapsed + minOf(status?.plan?.remainingMs ?: RECHECK_MS, RECHECK_MS)
      return
    }
    nextCheckAt = elapsed + RECHECK_MS
    val overlay = overlay
    if (overlay == null || !Settings.canDrawOverlays(appContext)) {
      notifyOverlayOff()
      return
    }
    Log.i(TAG, "Pausing $packageName (${status.plan.reason})")
    paused = status
    homeSentAt = elapsed
    overlay.show(status)
  }

  private fun refresh(shown: PauseStatus, elapsed: Long, force: Boolean) {
    invalidated = false
    nextCheckAt = elapsed + RECHECK_MS
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
    paused = null
    checked = null
    overlay?.hide()
  }

  private fun notifyOverlayOff() {
    if (overlayOffNotified) return
    overlayOffNotified = true
    Notifications.showOverlayOff(appContext)
  }
}
