package expo.modules.roolio.core.tracking

import expo.modules.roolio.core.budgets.BudgetStore
import expo.modules.roolio.core.budgets.Periods

internal data class TrackedApp(
  val packageName: String,
  // Start of its budget's current period: usage from here on must be counted,
  // including time spent before the app was added.
  val countFrom: Long,
)

/** The apps to measure, derived from the budgets in [RoolioDatabase]. */
internal data class TrackerConfig(val apps: List<TrackedApp>) {
  val packages: Set<String> = apps.mapTo(HashSet(apps.size)) { it.packageName }

  companion object {
    val EMPTY = TrackerConfig(emptyList())

    fun from(store: BudgetStore): TrackerConfig {
      val openPeriods = store.openPeriods()
      val apps =
        store.apps().mapNotNull { app ->
          val period = openPeriods[app.budgetId] ?: return@mapNotNull null
          TrackedApp(app.packageName, Periods.dayStart(period.startDay))
        }
      // A stable order, so an unchanged config compares equal.
      return TrackerConfig(apps.sortedBy { it.packageName })
    }
  }
}
