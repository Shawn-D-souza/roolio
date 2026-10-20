package expo.modules.roolio.core.tracking

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.os.Build
import android.os.SystemClock
import android.provider.Settings
import android.telecom.TelecomManager

// System UI shows the notification shade and, on some phones, Recents.
private const val SYSTEM_UI = "com.android.systemui"
// The default dialer or launcher can change without a package broadcast.
private const val MAX_AGE_MS = 10 * 60_000L

/**
 * Apps the pause screen treats specially. Read from the package manager once
 * and cached, so a tick only does set lookups.
 *
 * Runs on the tracker thread (see [UsageTracker.post]).
 */
internal object SystemApps {
  private class Snapshot(
    // Never paused (the exempt apps), plus launchers: sending the user home
    // must never land on a paused app.
    val exempt: Set<String>,
    // Where the user is while the pause screen is up: it stays up there.
    val behindPause: Set<String>,
    val readAt: Long,
  )

  private var snapshot: Snapshot? = null

  /** Whether `packageName` may never be paused. */
  fun isExempt(context: Context, packageName: String): Boolean =
    read(context).exempt.contains(packageName)

  /** Whether the pause screen stays up while `packageName` is in front: the home screen or System UI. */
  fun keepsPause(context: Context, packageName: String): Boolean =
    read(context).behindPause.contains(packageName)

  /** Re-reads the apps on next use, e.g. after an app was installed or removed. */
  fun invalidate() {
    snapshot = null
  }

  private fun read(context: Context): Snapshot {
    val now = SystemClock.elapsedRealtime()
    snapshot?.let { if (now - it.readAt < MAX_AGE_MS) return it }
    val packageManager = context.packageManager
    val home = handlers(packageManager, Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME))
    val exempt = HashSet<String>(home)
    exempt += context.packageName
    (context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager)
      ?.defaultDialerPackage
      ?.let(exempt::add)
    exempt += handlers(packageManager, Intent(Intent.ACTION_DIAL))
    exempt += handlers(packageManager, Intent(Settings.ACTION_SETTINGS))
    return Snapshot(exempt, home + SYSTEM_UI, now).also { snapshot = it }
  }

  private fun handlers(packageManager: PackageManager, intent: Intent): Set<String> {
    val activities: List<ResolveInfo> =
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          packageManager.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0L))
        } else {
          @Suppress("DEPRECATION")
          packageManager.queryIntentActivities(intent, 0)
        }
      } catch (ignored: RuntimeException) {
        // The package manager died (e.g. the system is shutting down).
        emptyList()
      }
    return activities.mapNotNullTo(HashSet()) { it.activityInfo?.packageName }
  }
}
