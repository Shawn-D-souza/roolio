package expo.modules.roolio.core.tracking

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import expo.modules.roolio.core.budgets.BudgetStore
import expo.modules.roolio.core.db.RoolioDatabase

// Resumes tracking after a restart or an app update, without opening Roolio,
// so budgets keep being enforced across restarts.
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
      intent.action != Intent.ACTION_MY_PACKAGE_REPLACED
    ) {
      return
    }
    TrackingService.sync(context, BudgetStore(RoolioDatabase.get(context)).hasApps())
  }
}
