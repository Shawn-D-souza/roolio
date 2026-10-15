package expo.modules.roolio.usage

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Resumes tracking after a restart or an app update, without opening Roolio
// (PRD §9: usage so far persists across restarts).
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
      intent.action != Intent.ACTION_MY_PACKAGE_REPLACED
    ) {
      return
    }
    TrackingService.sync(context, TrackerConfig.load(context).apps.isNotEmpty())
  }
}
