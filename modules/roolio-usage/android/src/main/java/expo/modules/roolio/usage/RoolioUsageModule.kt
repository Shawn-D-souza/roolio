package expo.modules.roolio.usage

import android.content.Context
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

internal class UsageTrackingException(cause: Throwable) :
  CodedException("Usage tracking failed: ${cause.message}", cause)

class TrackedAppRecord : Record {
  @Field val packageName: String = ""

  @Field val period: String = "day"
}

// Connects JS to the native usage tracker.
class RoolioUsageModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is unavailable" }

  override fun definition() = ModuleDefinition {
    Name("RoolioUsage")

    OnCreate { UsageTracker.init(context) }

    // Sets which apps are tracked, then starts or stops the service to match.
    AsyncFunction("syncTrackedAppsAsync") {
      apps: List<TrackedAppRecord>,
      firstDayOfWeek: Int,
      promise: Promise ->
      val applicationContext = context.applicationContext
      val tracked =
        apps
          .filter { it.packageName.isNotBlank() }
          .distinctBy { it.packageName }
          // A stable order, so an unchanged list compares equal.
          .sortedBy { it.packageName }
          .map { TrackedApp(it.packageName, BudgetPeriod.from(it.period)) }
      onTracker(promise) {
        UsageTracker.applyConfig(TrackerConfig(tracked, firstDayOfWeek))
        TrackingService.sync(applicationContext, tracked.isNotEmpty())
        null
      }
    }

    AsyncFunction("getPeriodUsageAsync") { promise: Promise ->
      onTracker(promise) { UsageTracker.periodUsage().mapValues { it.value.toDouble() } }
    }

    Function("isTrackingActive") { TrackingService.isRunning }
  }

  // Runs `block` on the tracker's thread, where all its state lives.
  private fun onTracker(promise: Promise, block: () -> Any?) {
    UsageTracker.post {
      try {
        promise.resolve(block())
      } catch (error: RuntimeException) {
        promise.reject(UsageTrackingException(error))
      }
    }
  }
}
