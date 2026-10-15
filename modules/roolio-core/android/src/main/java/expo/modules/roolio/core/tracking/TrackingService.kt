package expo.modules.roolio.core.tracking

import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import expo.modules.roolio.core.budgets.BudgetStore
import expo.modules.roolio.core.db.RoolioDatabase

/**
 * Keeps [UsageTracker] running while other apps are in use.
 *
 * It does work only while the screen is on. When the screen turns off, all
 * callbacks are removed, so the CPU is never woken for Roolio. There are no
 * wake locks and no alarms.
 */
class TrackingService : Service() {
  private val screenReceiver =
    object : BroadcastReceiver() {
      override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
          Intent.ACTION_SCREEN_ON -> UsageTracker.startTicking()
          Intent.ACTION_SCREEN_OFF -> UsageTracker.stopTicking()
        }
      }
    }

  override fun onCreate() {
    super.onCreate()
    isRunning = true
    UsageTracker.init(this)
    UsageTracker.onAccessLost = {
      Notifications.showAccessLost(this)
      stopSelf()
    }
    val filter =
      IntentFilter().apply {
        addAction(Intent.ACTION_SCREEN_ON)
        addAction(Intent.ACTION_SCREEN_OFF)
      }
    // Screen broadcasts are system-only, so the receiver needs no export.
    ContextCompat.registerReceiver(this, screenReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // Every start must promote the service, even one that is about to stop.
    if (!promoteToForeground()) {
      stopSelf()
      return START_NOT_STICKY
    }
    // The system may restart the service after the budgets or the permission changed.
    if (!BudgetStore(RoolioDatabase.get(this)).hasApps() || !UsageAccess.isGranted(this)) {
      stopSelf()
      return START_NOT_STICKY
    }
    Notifications.cancelAccessLost(this)
    val power = getSystemService(Context.POWER_SERVICE) as PowerManager
    if (power.isInteractive) UsageTracker.startTicking()
    return START_STICKY
  }

  override fun onDestroy() {
    unregisterReceiver(screenReceiver)
    UsageTracker.onAccessLost = null
    UsageTracker.stopTicking()
    isRunning = false
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun promoteToForeground(): Boolean {
    val notification = Notifications.tracking(this)
    return try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        ServiceCompat.startForeground(
          this,
          Notifications.TRACKING_ID,
          notification,
          ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
        )
      } else {
        startForeground(Notifications.TRACKING_ID, notification)
      }
      true
    } catch (error: IllegalStateException) {
      // Android 12+ refuses some background starts; the next app open restarts it.
      Log.w("RoolioCore", "Couldn't start tracking in the foreground", error)
      false
    } catch (error: SecurityException) {
      Log.w("RoolioCore", "Couldn't start tracking in the foreground", error)
      false
    }
  }

  companion object {
    @Volatile
    var isRunning = false
      private set

    /** Starts tracking if there's something to track and Usage Access is on; stops it otherwise. */
    fun sync(context: Context, hasTrackedApps: Boolean) {
      val shouldRun = hasTrackedApps && UsageAccess.isGranted(context)
      when {
        shouldRun && !isRunning -> start(context)
        !shouldRun && isRunning -> context.stopService(Intent(context, TrackingService::class.java))
      }
    }

    fun start(context: Context) {
      try {
        ContextCompat.startForegroundService(context, Intent(context, TrackingService::class.java))
      } catch (error: IllegalStateException) {
        // Not allowed from the background right now (Android 12+).
        Log.w("RoolioCore", "Couldn't start tracking", error)
      }
    }
  }
}
