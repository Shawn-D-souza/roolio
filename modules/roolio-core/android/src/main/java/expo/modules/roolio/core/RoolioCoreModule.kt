package expo.modules.roolio.core

import android.content.Context
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.roolio.core.budgets.BorrowOffer
import expo.modules.roolio.core.budgets.BorrowedChoice
import expo.modules.roolio.core.budgets.BudgetException
import expo.modules.roolio.core.budgets.BudgetPeriod
import expo.modules.roolio.core.budgets.BudgetSettings
import expo.modules.roolio.core.budgets.BudgetStatus
import expo.modules.roolio.core.budgets.Budgets
import expo.modules.roolio.core.budgets.NewApp
import expo.modules.roolio.core.budgets.PeriodRow
import expo.modules.roolio.core.tracking.TrackingService
import expo.modules.roolio.core.tracking.UsageTracker

internal class UsageTrackingException(cause: Throwable) :
  CodedException("Usage tracking failed: ${cause.message}", cause)

class NewAppRecord : Record {
  @Field val packageName: String = ""

  @Field val appName: String = ""

  @Field val iconVersion: Double = 0.0
}

class BudgetSettingsRecord : Record {
  @Field val period: String = "day"

  @Field val budgetMinutes: Int = 0

  @Field val rolloverCeiling: Int = 0

  @Field val borrowCap: Int = 0
}

// Connects JS to budgets, their ledger and the native usage tracker.
class RoolioCoreModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is unavailable" }

  override fun definition() = ModuleDefinition {
    Name("RoolioCore")

    OnCreate { Budgets.init(context) }

    AsyncFunction("getBudgetsAsync") { promise: Promise ->
      onTracker(promise) { Budgets.list().map(::statusToMap) }
    }

    AsyncFunction("getAppBudgetAsync") { packageName: String, promise: Promise ->
      onTracker(promise) { Budgets.forApp(packageName)?.let(::statusToMap) }
    }

    AsyncFunction("getHistoryAsync") { budgetId: Double, promise: Promise ->
      onTracker(promise) {
        Budgets.history(budgetId.toLong()).map { past ->
          periodToMap(past.row) +
            mapOf(
              "usedMs" to past.row.usedMs?.toDouble(),
              "bankedOutMs" to past.row.bankedOutMs?.toDouble(),
              "gainedMs" to past.gainedMs.toDouble(),
              "closedAt" to past.row.closedAt?.toDouble(),
            )
        }
      }
    }

    AsyncFunction("createAppBudgetAsync") {
      app: NewAppRecord,
      settings: BudgetSettingsRecord,
      promise: Promise ->
      onTracker(promise) {
        Budgets.createAppBudget(
          NewApp(app.packageName, app.appName, app.iconVersion.toLong()),
          settings.toSettings(),
        ).toDouble()
      }
    }

    AsyncFunction("updateBudgetAsync") {
      budgetId: Double,
      settings: BudgetSettingsRecord,
      borrowedChoice: String?,
      promise: Promise ->
      onTracker(promise) {
        Budgets.update(budgetId.toLong(), settings.toSettings(), BorrowedChoice.from(borrowedChoice))
        null
      }
    }

    AsyncFunction("deleteAppBudgetsAsync") { packageNames: List<String>, promise: Promise ->
      onTracker(promise) {
        Budgets.deleteAppBudgets(packageNames)
        null
      }
    }

    AsyncFunction("borrowAsync") { budgetId: Double, promise: Promise ->
      onTracker(promise) { offerToMap(Budgets.borrow(budgetId.toLong())) }
    }

    AsyncFunction("setFirstDayOfWeekAsync") { day: Int, promise: Promise ->
      onTracker(promise) {
        Budgets.setFirstDayOfWeek(day)
        null
      }
    }

    // Starts or stops the tracking service to match the budgets and Usage Access.
    AsyncFunction("syncTrackingAsync") { promise: Promise ->
      onTracker(promise) {
        Budgets.syncTracking()
        null
      }
    }

    Function("isTrackingActive") { TrackingService.isRunning }
  }

  // Runs `block` on the tracker's thread, where all budget and usage state lives.
  private fun onTracker(promise: Promise, block: () -> Any?) {
    UsageTracker.post {
      try {
        promise.resolve(block())
      } catch (error: BudgetException) {
        promise.reject(CodedException(error.code, error.message, null))
      } catch (error: RuntimeException) {
        promise.reject(UsageTrackingException(error))
      }
    }
  }
}

private fun BudgetSettingsRecord.toSettings(): BudgetSettings {
  val period =
    try {
      BudgetPeriod.from(period)
    } catch (error: IllegalArgumentException) {
      throw BudgetException("ERR_INVALID_SETTINGS", error.message ?: "Invalid period")
    }
  return BudgetSettings(period, budgetMinutes, rolloverCeiling, borrowCap)
}

private fun statusToMap(status: BudgetStatus): Map<String, Any?> {
  val budget = status.budget
  val current = status.current
  return mapOf(
    "id" to budget.id.toDouble(),
    "kind" to budget.kind.key,
    "name" to budget.name,
    "period" to budget.settings.period.key,
    "budgetMinutes" to budget.settings.budgetMinutes,
    "rolloverCeiling" to budget.settings.rolloverCeiling,
    "borrowCap" to budget.settings.borrowCap,
    "createdAt" to budget.createdAt.toDouble(),
    "updatedAt" to budget.updatedAt.toDouble(),
    "apps" to
      status.apps.map { app ->
        mapOf(
          "packageName" to app.packageName,
          "appName" to app.appName,
          "iconVersion" to app.iconVersion.toDouble(),
        )
      },
    "current" to
      periodToMap(current.row) +
        mapOf(
          "usedMs" to current.usedMs.toDouble(),
          "availableMs" to current.availableMs.toDouble(),
          "bankedMs" to current.bankedMs.toDouble(),
          "gainedMs" to current.gainedMs.toDouble(),
          "gainedLeftMs" to current.gainedLeftMs.toDouble(),
          "borrowedPeriods" to current.borrowedPeriods,
          "owedMs" to current.owedMs.toDouble(),
          "nextBorrow" to current.nextBorrow?.let(::offerToMap),
        ),
  )
}

private fun periodToMap(row: PeriodRow): Map<String, Any?> =
  mapOf(
    "period" to row.period.key,
    "startDay" to row.startDay,
    "endDay" to row.endDay,
    "budgetMinutes" to row.budgetMinutes,
    "borrowed" to row.borrowed,
    "repaidMs" to row.repaidMs.toDouble(),
    "bankedInMs" to row.bankedInMs.toDouble(),
  )

private fun offerToMap(offer: BorrowOffer): Map<String, Any?> =
  mapOf(
    "targetDay" to offer.targetDay,
    "amountMs" to offer.amountMs.toDouble(),
    "slotsLeft" to offer.slotsLeft,
  )
