package expo.modules.roolio.permissions

import android.Manifest
import android.app.AppOpsManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.Process
import android.os.SystemClock
import android.provider.Settings
import android.widget.Toast
import expo.modules.interfaces.permissions.PermissionsResponse
import expo.modules.interfaces.permissions.PermissionsStatus
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val PREFS_NAME = "roolio_permissions"
private const val KEY_SETUP_COMPLETED = "setup_completed"
private const val KEY_NOTIFICATIONS_DECLINED = "notifications_declined"

// How often, and for how long, to check whether the user granted the permission in Settings.
private const val WATCH_INTERVAL_MS = 400L
private const val WATCH_TIMEOUT_MS = 3 * 60 * 1000L

internal class PermissionsUnavailableException :
  CodedException("The permissions manager is unavailable")

internal class UnknownPermissionException(permission: String) :
  CodedException("Unknown permission \"$permission\"")

internal class SettingsUnavailableException(permission: String) :
  CodedException("Could not open the settings screen for \"$permission\"")

// Checks Roolio's three permissions and opens the system screens that grant them.
class RoolioPermissionsModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is unavailable" }

  // The Settings watcher lives on the main thread only: every entry point posts
  // to this handler, so its state below is never shared across threads.
  private val mainHandler = Handler(Looper.getMainLooper())
  private var watchedPermission: String? = null
  private var watchStartedAt = 0L

  // While the user is in Settings, bring Roolio back as soon as the permission is on.
  private val watchTick =
    object : Runnable {
      override fun run() {
        val permission = watchedPermission ?: return
        when {
          isGranted(permission) -> {
            stopWatching()
            returnToRoolio()
          }
          SystemClock.elapsedRealtime() - watchStartedAt > WATCH_TIMEOUT_MS -> stopWatching()
          else -> mainHandler.postDelayed(this, WATCH_INTERVAL_MS)
        }
      }
    }

  override fun definition() = ModuleDefinition {
    Name("RoolioPermissions")

    // Synchronous so the app can decide which screen to show on its first render.
    Function("getStatus") {
      mapOf(
        "usageAccess" to hasUsageAccess(),
        "overlay" to Settings.canDrawOverlays(context),
        "notifications" to hasNotificationPermission(),
      )
    }

    // Whether the required permissions were ever all granted on this install.
    Function("hasCompletedSetup") {
      prefs().getBoolean(KEY_SETUP_COMPLETED, false)
    }

    Function("markSetupCompleted") {
      prefs().edit().putBoolean(KEY_SETUP_COMPLETED, true).apply()
    }

    // Whether the user chose not to be asked for notifications again.
    Function("hasDeclinedNotifications") {
      prefs().getBoolean(KEY_NOTIFICATIONS_DECLINED, false)
    }

    Function("markNotificationsDeclined") {
      prefs().edit().putBoolean(KEY_NOTIFICATIONS_DECLINED, true).apply()
    }

    AsyncFunction("getNotificationPermissionAsync") { promise: Promise ->
      if (!notificationsAreRuntimePermission()) {
        promise.resolve(notificationResult(granted = true, canAskAgain = true))
        return@AsyncFunction
      }
      val permissions = appContext.permissions ?: throw PermissionsUnavailableException()
      permissions.getPermissions({ result ->
        promise.resolve(notificationResult(result[Manifest.permission.POST_NOTIFICATIONS]))
      }, Manifest.permission.POST_NOTIFICATIONS)
    }

    AsyncFunction("requestNotificationPermissionAsync") { promise: Promise ->
      if (!notificationsAreRuntimePermission()) {
        promise.resolve(notificationResult(granted = true, canAskAgain = true))
        return@AsyncFunction
      }
      val permissions = appContext.permissions ?: throw PermissionsUnavailableException()
      permissions.askForPermissions({ result ->
        promise.resolve(notificationResult(result[Manifest.permission.POST_NOTIFICATIONS]))
      }, Manifest.permission.POST_NOTIFICATIONS)
    }

    // Opens the Settings screen for `permission`, shows `hint` there as a toast,
    // and watches for the grant so Roolio can come back by itself.
    Function("openSettings") { permission: String, hint: String ->
      openSettings(permission, settingsIntents(permission))
      showToast(hint)
      mainHandler.post { startWatching(permission) }
    }

    OnActivityEntersForeground {
      mainHandler.post { stopWatching() }
    }

    OnDestroy {
      mainHandler.post { stopWatching() }
    }
  }

  private fun isGranted(permission: String): Boolean =
    when (permission) {
      "usageAccess" -> hasUsageAccess()
      "overlay" -> Settings.canDrawOverlays(context)
      "notifications" -> hasNotificationPermission()
      else -> throw UnknownPermissionException(permission)
    }

  // Each permission tries Roolio's own page first; some devices only support the list.
  private fun settingsIntents(permission: String): List<Intent> =
    when (permission) {
      "usageAccess" ->
        listOf(
          Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS, packageUri()),
          Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS),
        )
      "overlay" ->
        listOf(
          Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, packageUri()),
          Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION),
        )
      "notifications" ->
        listOf(
          Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
            .putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName),
          Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, packageUri()),
        )
      else -> throw UnknownPermissionException(permission)
    }

  private fun hasUsageAccess(): Boolean {
    val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        appOps.unsafeCheckOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          context.packageName,
        )
      } else {
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          context.packageName,
        )
      }
    // MODE_DEFAULT means the op defers to the permission itself (seen on some OEM builds).
    if (mode == AppOpsManager.MODE_DEFAULT) {
      return context.checkSelfPermission(Manifest.permission.PACKAGE_USAGE_STATS) ==
        PackageManager.PERMISSION_GRANTED
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  // Notifications only became a runtime permission in Android 13.
  private fun notificationsAreRuntimePermission(): Boolean =
    Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU

  private fun hasNotificationPermission(): Boolean =
    !notificationsAreRuntimePermission() ||
      context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
      PackageManager.PERMISSION_GRANTED

  private fun notificationResult(response: PermissionsResponse?): Map<String, Boolean> =
    notificationResult(
      granted = response?.status == PermissionsStatus.GRANTED,
      canAskAgain = response?.canAskAgain ?: false,
    )

  private fun notificationResult(granted: Boolean, canAskAgain: Boolean) =
    mapOf("granted" to granted, "canAskAgain" to canAskAgain)

  private fun prefs() = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  private fun packageUri(): Uri = Uri.fromParts("package", context.packageName, null)

  // Starting from the activity keeps Settings in Roolio's task, so Back returns here.
  private fun openSettings(permission: String, intents: List<Intent>) {
    val activity = appContext.currentActivity
    for (intent in intents) {
      try {
        if (activity != null) {
          activity.startActivity(intent)
        } else {
          context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
        return
      } catch (ignored: ActivityNotFoundException) {
        // Try the next, more general screen.
      } catch (ignored: SecurityException) {
        // Some OEMs protect the per-app page; fall back to the list.
      }
    }
    throw SettingsUnavailableException(permission)
  }

  // A plain text toast is allowed over other apps, so it shows on top of Settings.
  private fun showToast(text: String) {
    if (text.isBlank()) return
    val applicationContext = context.applicationContext
    mainHandler.post { Toast.makeText(applicationContext, text, Toast.LENGTH_LONG).show() }
  }

  private fun startWatching(permission: String) {
    mainHandler.removeCallbacks(watchTick)
    watchedPermission = permission
    watchStartedAt = SystemClock.elapsedRealtime()
    mainHandler.postDelayed(watchTick, WATCH_INTERVAL_MS)
  }

  private fun stopWatching() {
    watchedPermission = null
    mainHandler.removeCallbacks(watchTick)
  }

  // Clears Settings off Roolio's task and brings Roolio to the front. Android may
  // block this on some versions; the user can still press Back, so failure is harmless.
  private fun returnToRoolio() {
    val activity = appContext.currentActivity
    val intent =
      if (activity != null) {
        Intent(context, activity.javaClass)
      } else {
        context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
      }
    intent.addFlags(
      Intent.FLAG_ACTIVITY_NEW_TASK or
        Intent.FLAG_ACTIVITY_CLEAR_TOP or
        Intent.FLAG_ACTIVITY_SINGLE_TOP,
    )
    try {
      context.startActivity(intent)
    } catch (ignored: RuntimeException) {
      // Blocked background start; the user returns with Back instead.
    }
  }
}
