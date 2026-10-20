package expo.modules.roolio.core.tracking

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.roolio.core.R
import expo.modules.roolio.core.budgets.BudgetPeriod
import expo.modules.roolio.core.budgets.MINUTE_MS
import expo.modules.roolio.core.budgets.PauseStatus

private const val TRACKING_CHANNEL_ID = "budget_tracking"
private const val ALERTS_CHANNEL_ID = "permission_alerts"
private const val TIME_CHANNEL_ID = "time_alerts"
// Time-left alerts are tagged and keyed by budget id, one per budget.
private const val TIME_LEFT_TAG = "time_left"
// Every notification has a group of its own kind. Android bundles an app's
// ungrouped notifications together, and a bundle ranks as its loudest
// member, which would pull the silent tracking notification up next to a
// time-left alert.
private const val TRACKING_GROUP = "expo.modules.roolio.core.TRACKING"
private const val TIME_LEFT_GROUP = "expo.modules.roolio.core.TIME_LEFT"
private const val PERMISSION_GROUP = "expo.modules.roolio.core.PERMISSIONS"
private const val ACCESS_LOST_ID = 1002
private const val OVERLAY_OFF_ID = 1003

// Roolio's primary indigo (light theme `primary`).
private const val ACCENT_COLOR = 0xFF4F46B8.toInt()

internal object Notifications {
  const val TRACKING_ID = 1001

  /** The silent, ongoing notification Android requires while the service runs. */
  fun tracking(context: Context): Notification {
    ensureChannels(context)
    return NotificationCompat.Builder(context, TRACKING_CHANNEL_ID)
      .setSmallIcon(R.drawable.roolio_ic_notification)
      .setColor(ACCENT_COLOR)
      .setContentTitle(context.getString(R.string.roolio_tracking_title))
      .setContentText(context.getString(R.string.roolio_tracking_text))
      .setContentIntent(openRoolio(context))
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setGroup(TRACKING_GROUP)
      .setPriority(NotificationCompat.PRIORITY_MIN)
      .setVisibility(NotificationCompat.VISIBILITY_SECRET)
      .setOngoing(true)
      .setSilent(true)
      .setShowWhen(false)
      .setLocalOnly(true)
      // Don't flash a notification for a service that only runs briefly.
      .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_DEFERRED)
      .build()
  }

  /** Tells the user that tracking stopped because Usage Access was turned off. */
  fun showAccessLost(context: Context) {
    showPermissionAlert(
      context,
      ACCESS_LOST_ID,
      R.string.roolio_access_lost_title,
      R.string.roolio_access_lost_text,
    )
  }

  fun cancelAccessLost(context: Context) {
    NotificationManagerCompat.from(context).cancel(ACCESS_LOST_ID)
  }

  /** Tells the user that apps aren't paused because Display over other apps was turned off. */
  fun showOverlayOff(context: Context) {
    showPermissionAlert(
      context,
      OVERLAY_OFF_ID,
      R.string.roolio_overlay_off_title,
      R.string.roolio_overlay_off_text,
    )
  }

  fun cancelOverlayOff(context: Context) {
    NotificationManagerCompat.from(context).cancel(OVERLAY_OFF_ID)
  }

  /**
   * Tells the user that `status`'s app is about to be paused. The alert for
   * the same budget replaces it, so "1 minute left" replaces "5 minutes left".
   */
  fun showTimeLeft(context: Context, status: PauseStatus) {
    val manager = NotificationManagerCompat.from(context)
    if (!manager.areNotificationsEnabled()) return
    ensureChannels(context)
    val res = context.resources
    val plan = status.plan
    // Rounded up, as Home shows it: the ledger counts usage in whole minutes, rounded down.
    val minutes = ((plan.remainingMs + MINUTE_MS - 1) / MINUTE_MS).toInt().coerceAtLeast(1)
    // Whether more time can be borrowed when this pause comes.
    val text =
      res.getString(
        if (plan.stopAtMs < plan.capEndMs) {
          R.string.roolio_time_left_text_borrow
        } else {
          when (status.period) {
            BudgetPeriod.DAY -> R.string.roolio_time_left_text_last_day
            BudgetPeriod.WEEK -> R.string.roolio_time_left_text_last_week
            BudgetPeriod.MONTH -> R.string.roolio_time_left_text_last_month
          }
        }
      )
    val notification =
      NotificationCompat.Builder(context, TIME_CHANNEL_ID)
        .setSmallIcon(R.drawable.roolio_ic_notification)
        .setColor(ACCENT_COLOR)
        .setContentTitle(res.getQuantityString(R.plurals.roolio_time_left_title, minutes, minutes, status.appName))
        .setContentText(text)
        .setStyle(NotificationCompat.BigTextStyle().bigText(text))
        .setContentIntent(openRoolio(context))
        .setCategory(NotificationCompat.CATEGORY_REMINDER)
        .setGroup(TIME_LEFT_GROUP)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setAutoCancel(true)
        .setLocalOnly(true)
        .build()
    try {
      manager.notify(TIME_LEFT_TAG, status.budgetId.toInt(), notification)
    } catch (ignored: SecurityException) {
      // Notifications were turned off in the meantime.
    }
  }

  fun cancelTimeLeft(context: Context, budgetId: Long) {
    NotificationManagerCompat.from(context).cancel(TIME_LEFT_TAG, budgetId.toInt())
  }

  private fun showPermissionAlert(context: Context, id: Int, titleRes: Int, textRes: Int) {
    val manager = NotificationManagerCompat.from(context)
    if (!manager.areNotificationsEnabled()) return
    ensureChannels(context)
    val text = context.getString(textRes)
    val notification =
      NotificationCompat.Builder(context, ALERTS_CHANNEL_ID)
        .setSmallIcon(R.drawable.roolio_ic_notification)
        .setColor(ACCENT_COLOR)
        .setContentTitle(context.getString(titleRes))
        .setContentText(text)
        .setStyle(NotificationCompat.BigTextStyle().bigText(text))
        .setContentIntent(openRoolio(context))
        .setCategory(NotificationCompat.CATEGORY_STATUS)
        .setGroup(PERMISSION_GROUP)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .setAutoCancel(true)
        .setOnlyAlertOnce(true)
        .build()
    try {
      manager.notify(id, notification)
    } catch (ignored: SecurityException) {
      // Notifications were turned off in the meantime.
    }
  }

  // Opens Roolio as if from the launcher. It shows the permissions screen by
  // itself when something is missing.
  private fun openRoolio(context: Context): PendingIntent? {
    val intent =
      context.packageManager.getLaunchIntentForPackage(context.packageName)?.apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
      } ?: return null
    return PendingIntent.getActivity(
      context,
      0,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
  }

  private fun ensureChannels(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java) ?: return
    // Creating an existing channel is a no-op, and keeps the user's choices.
    val tracking =
      NotificationChannel(
          TRACKING_CHANNEL_ID,
          context.getString(R.string.roolio_tracking_channel_name),
          NotificationManager.IMPORTANCE_MIN,
        )
        .apply {
          description = context.getString(R.string.roolio_tracking_channel_description)
          setShowBadge(false)
          setSound(null, null)
          enableVibration(false)
          enableLights(false)
          lockscreenVisibility = Notification.VISIBILITY_SECRET
        }
    val alerts =
      NotificationChannel(
          ALERTS_CHANNEL_ID,
          context.getString(R.string.roolio_alerts_channel_name),
          NotificationManager.IMPORTANCE_DEFAULT,
        )
        .apply {
          description = context.getString(R.string.roolio_alerts_channel_description)
          setShowBadge(false)
        }
    // High importance: it shows over the app being used, which is the point.
    val time =
      NotificationChannel(
          TIME_CHANNEL_ID,
          context.getString(R.string.roolio_time_channel_name),
          NotificationManager.IMPORTANCE_HIGH,
        )
        .apply {
          description = context.getString(R.string.roolio_time_channel_description)
          setShowBadge(false)
        }
    manager.createNotificationChannels(listOf(tracking, alerts, time))
  }
}
