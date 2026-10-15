package expo.modules.roolio.usage

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

private const val TRACKING_CHANNEL_ID = "budget_tracking"
private const val ALERTS_CHANNEL_ID = "permission_alerts"
private const val ACCESS_LOST_ID = 1002

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

  /** PRD §8.5: tells the user that tracking stopped because Usage Access was turned off. */
  fun showAccessLost(context: Context) {
    val manager = NotificationManagerCompat.from(context)
    if (!manager.areNotificationsEnabled()) return
    ensureChannels(context)
    val text = context.getString(R.string.roolio_access_lost_text)
    val notification =
      NotificationCompat.Builder(context, ALERTS_CHANNEL_ID)
        .setSmallIcon(R.drawable.roolio_ic_notification)
        .setColor(ACCENT_COLOR)
        .setContentTitle(context.getString(R.string.roolio_access_lost_title))
        .setContentText(text)
        .setStyle(NotificationCompat.BigTextStyle().bigText(text))
        .setContentIntent(openRoolio(context))
        .setCategory(NotificationCompat.CATEGORY_STATUS)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
        .setAutoCancel(true)
        .setOnlyAlertOnce(true)
        .build()
    try {
      manager.notify(ACCESS_LOST_ID, notification)
    } catch (ignored: SecurityException) {
      // Notifications were turned off in the meantime.
    }
  }

  fun cancelAccessLost(context: Context) {
    NotificationManagerCompat.from(context).cancel(ACCESS_LOST_ID)
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
    manager.createNotificationChannels(listOf(tracking, alerts))
  }
}
