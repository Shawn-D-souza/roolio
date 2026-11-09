package expo.modules.roolio.core.plan

import android.content.Context
import expo.modules.roolio.core.budgets.BudgetPeriod

// The same file as the theme choice.
private const val PREFS_NAME = "roolio_core"
private const val KEY_EARLY_ACCESS = "early_access_premium"

/** How many apps can have a budget without Premium. */
internal const val FREE_APP_LIMIT = 3

/**
 * Whether the user has Premium, and what the free plan allows. During early
 * access, Premium is free: the user turns it on or off from the Premium screen.
 *
 * Without Premium, Roolio budgets up to [FREE_APP_LIMIT] apps, by the day only,
 * and Stats is locked. Budgets made with Premium keep working without it; only
 * new apps and switching to a longer period need it.
 *
 * Saved in SharedPreferences so the first render can read it synchronously.
 * Safe to call from any thread.
 */
internal object Premium {
  fun isActive(context: Context): Boolean = prefs(context).getBoolean(KEY_EARLY_ACCESS, false)

  fun setEarlyAccess(context: Context, on: Boolean) {
    prefs(context).edit().putBoolean(KEY_EARLY_ACCESS, on).apply()
  }

  /** Whether a budget can be set to `period` on the free plan. */
  fun isFreePeriod(period: BudgetPeriod): Boolean = period == BudgetPeriod.DAY

  private fun prefs(context: Context) =
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
}
