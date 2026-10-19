package expo.modules.roolio.core.budgets

import android.content.ContentValues
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import expo.modules.roolio.core.db.RoolioDatabase
import java.util.Calendar

internal enum class BudgetKind(val key: String) {
  APP("app"),
  GROUP("group"),
  TOTAL("total");

  companion object {
    fun from(key: String): BudgetKind =
      entries.firstOrNull { it.key == key } ?: throw IllegalArgumentException("Unknown kind \"$key\"")
  }
}

/** The values of a budget the user chooses. */
internal data class BudgetSettings(
  val period: BudgetPeriod,
  val budgetMinutes: Int,
  val rolloverCeiling: Int,
  val borrowCap: Int,
)

internal data class BudgetRow(
  val id: Long,
  val kind: BudgetKind,
  val name: String?,
  val settings: BudgetSettings,
  val createdAt: Long,
  val updatedAt: Long,
)

internal data class BudgetAppRow(
  val packageName: String,
  val budgetId: Long,
  val appName: String,
  val iconVersion: Long,
  val addedAt: Long,
)

internal data class PeriodRow(
  val id: Long,
  val budgetId: Long,
  val period: BudgetPeriod,
  val startDay: String,
  val endDay: String,
  val openedAt: Long,
  val closedAt: Long?,
  val budgetMinutes: Int,
  val repaidMs: Long,
  val bankedInMs: Long,
  val usedMs: Long?,
  val bankedOutMs: Long?,
  val lowAlertAt: Long?,
) {
  val ownBudgetMs: Long
    get() = Ledger.ownBudgetMs(budgetMinutes, repaidMs)
}

internal data class BorrowRow(
  val id: Long,
  val budgetId: Long,
  val periodId: Long,
  val amountMs: Long,
  val repaidMs: Long,
  val createdAt: Long,
  val clearedAt: Long?,
) {
  val outstandingMs: Long
    get() = amountMs - repaidMs
}

private const val KEY_FIRST_DAY_OF_WEEK = "first_day_of_week"

/**
 * Row-level reads and writes of budgets and their ledger. Holds no rules: see
 * [Budgets] for those. Callers wrap multi-step changes in [transaction].
 */
internal class BudgetStore(private val database: RoolioDatabase) {
  private val db: SQLiteDatabase
    get() = database.writableDatabase

  fun <T> transaction(block: () -> T): T {
    val db = db
    db.beginTransaction()
    try {
      val result = block()
      db.setTransactionSuccessful()
      return result
    } finally {
      db.endTransaction()
    }
  }

  // Settings

  /** A java.util.Calendar day; Monday until the user chooses. */
  fun firstDayOfWeek(): Int =
    setting(KEY_FIRST_DAY_OF_WEEK)?.toIntOrNull()?.takeIf { it in Calendar.SUNDAY..Calendar.SATURDAY }
      ?: Calendar.MONDAY

  fun setFirstDayOfWeek(day: Int) {
    require(day in Calendar.SUNDAY..Calendar.SATURDAY) { "Invalid first day of week $day" }
    putSetting(KEY_FIRST_DAY_OF_WEEK, day.toString())
  }

  fun setting(key: String): String? =
    db.rawQuery("SELECT value FROM settings WHERE key = ?", arrayOf(key)).use { cursor ->
      if (cursor.moveToFirst()) cursor.getString(0) else null
    }

  fun putSetting(key: String, value: String) {
    db.insertWithOnConflict(
      "settings",
      null,
      ContentValues(2).apply {
        put("key", key)
        put("value", value)
      },
      SQLiteDatabase.CONFLICT_REPLACE,
    )
  }

  // Budgets

  fun budgets(): List<BudgetRow> =
    db.rawQuery("SELECT * FROM budgets ORDER BY id", null).use { cursor ->
      cursor.map { it.toBudget() }
    }

  fun budget(id: Long): BudgetRow? =
    db.rawQuery("SELECT * FROM budgets WHERE id = ?", arrayOf(id.toString())).use { cursor ->
      if (cursor.moveToFirst()) cursor.toBudget() else null
    }

  fun insertBudget(kind: BudgetKind, name: String?, settings: BudgetSettings, now: Long): Long =
    db.insertOrThrow(
      "budgets",
      null,
      settings.toValues().apply {
        put("kind", kind.key)
        put("name", name)
        put("created_at", now)
        put("updated_at", now)
      },
    )

  fun updateBudget(id: Long, settings: BudgetSettings, now: Long) {
    db.update(
      "budgets",
      settings.toValues().apply { put("updated_at", now) },
      "id = ?",
      arrayOf(id.toString()),
    )
  }

  /** Deletes budgets with their apps, periods and borrows. */
  fun deleteBudgets(ids: Collection<Long>) {
    for (id in ids) db.delete("budgets", "id = ?", arrayOf(id.toString()))
  }

  // Budget apps

  fun apps(): List<BudgetAppRow> =
    db.rawQuery("SELECT * FROM budget_apps ORDER BY added_at, package_name", null).use { cursor ->
      cursor.map { it.toBudgetApp() }
    }

  fun app(packageName: String): BudgetAppRow? =
    db.rawQuery("SELECT * FROM budget_apps WHERE package_name = ?", arrayOf(packageName)).use { cursor ->
      if (cursor.moveToFirst()) cursor.toBudgetApp() else null
    }

  fun insertApp(app: BudgetAppRow) {
    db.insertOrThrow(
      "budget_apps",
      null,
      ContentValues(5).apply {
        put("package_name", app.packageName)
        put("budget_id", app.budgetId)
        put("app_name", app.appName)
        put("icon_version", app.iconVersion)
        put("added_at", app.addedAt)
      },
    )
  }

  fun deleteApps(packageNames: Collection<String>) {
    for (packageName in packageNames) {
      db.delete("budget_apps", "package_name = ?", arrayOf(packageName))
    }
  }

  /** Whether any app is limited, so the tracker has something to measure. */
  fun hasApps(): Boolean =
    db.rawQuery("SELECT EXISTS (SELECT 1 FROM budget_apps)", null).use { cursor ->
      cursor.moveToFirst() && cursor.getInt(0) == 1
    }

  // Periods

  fun openPeriod(budgetId: Long): PeriodRow? =
    db
      .rawQuery(
        "SELECT * FROM periods WHERE budget_id = ? AND closed_at IS NULL",
        arrayOf(budgetId.toString()),
      )
      .use { cursor -> if (cursor.moveToFirst()) cursor.toPeriod() else null }

  /** Every open period, keyed by budget. */
  fun openPeriods(): Map<Long, PeriodRow> =
    db.rawQuery("SELECT * FROM periods WHERE closed_at IS NULL", null).use { cursor ->
      cursor.map { it.toPeriod() }.associateBy { it.budgetId }
    }

  /** Closed periods, newest first. */
  fun closedPeriods(budgetId: Long): List<PeriodRow> =
    db
      .rawQuery(
        "SELECT * FROM periods WHERE budget_id = ? AND closed_at IS NOT NULL ORDER BY start_day DESC, id DESC",
        arrayOf(budgetId.toString()),
      )
      .use { cursor -> cursor.map { it.toPeriod() } }

  fun insertPeriod(
    budgetId: Long,
    period: BudgetPeriod,
    startDay: String,
    endDay: String,
    budgetMinutes: Int,
    repaidMs: Long,
    bankedInMs: Long,
    now: Long,
  ): Long =
    db.insertOrThrow(
      "periods",
      null,
      ContentValues(8).apply {
        put("budget_id", budgetId)
        put("period", period.key)
        put("start_day", startDay)
        put("end_day", endDay)
        put("opened_at", now)
        put("budget_minutes", budgetMinutes)
        put("repaid_ms", repaidMs)
        put("banked_in_ms", bankedInMs)
      },
    )

  fun closePeriod(id: Long, closedAt: Long, usedMs: Long, bankedOutMs: Long) {
    db.update(
      "periods",
      ContentValues(3).apply {
        put("closed_at", closedAt)
        put("used_ms", usedMs)
        put("banked_out_ms", bankedOutMs)
      },
      "id = ?",
      arrayOf(id.toString()),
    )
  }

  fun setPeriodBudget(id: Long, budgetMinutes: Int, bankedInMs: Long) {
    db.update(
      "periods",
      ContentValues(2).apply {
        put("budget_minutes", budgetMinutes)
        put("banked_in_ms", bankedInMs)
      },
      "id = ?",
      arrayOf(id.toString()),
    )
  }

  fun setLowAlertAt(periodId: Long, time: Long) {
    db.update(
      "periods",
      ContentValues(1).apply { put("low_alert_at", time) },
      "id = ?",
      arrayOf(periodId.toString()),
    )
  }

  // Borrows

  /** Borrows not yet repaid or cleared, oldest first. */
  fun outstandingBorrows(budgetId: Long): List<BorrowRow> =
    db
      .rawQuery(
        """
        SELECT * FROM borrows
        WHERE budget_id = ? AND cleared_at IS NULL AND repaid_ms < amount_ms
        ORDER BY id
        """,
        arrayOf(budgetId.toString()),
      )
      .use { cursor -> cursor.map { it.toBorrow() } }

  /** Time borrowed in each period, keyed by period id. */
  fun borrowedMs(periodIds: Collection<Long>): Map<Long, Long> {
    if (periodIds.isEmpty()) return emptyMap()
    val placeholders = periodIds.joinToString(", ") { "?" }
    return db
      .rawQuery(
        "SELECT period_id, SUM(amount_ms) FROM borrows WHERE period_id IN ($placeholders) GROUP BY period_id",
        periodIds.map { it.toString() }.toTypedArray(),
      )
      .use { cursor ->
        val borrowed = HashMap<Long, Long>(cursor.count)
        while (cursor.moveToNext()) borrowed[cursor.getLong(0)] = cursor.getLong(1)
        borrowed
      }
  }

  /** Records time borrowed in a period, owed until upcoming periods pay it back. */
  fun insertBorrow(budgetId: Long, periodId: Long, amountMs: Long, now: Long): Long =
    db.insertOrThrow(
      "borrows",
      null,
      ContentValues(4).apply {
        put("budget_id", budgetId)
        put("period_id", periodId)
        put("amount_ms", amountMs)
        put("created_at", now)
      },
    )

  fun setBorrowRepaid(id: Long, repaidMs: Long) {
    db.update(
      "borrows",
      ContentValues(1).apply { put("repaid_ms", repaidMs) },
      "id = ?",
      arrayOf(id.toString()),
    )
  }

  fun clearBorrows(ids: Collection<Long>, now: Long) {
    for (id in ids) {
      db.update(
        "borrows",
        ContentValues(1).apply { put("cleared_at", now) },
        "id = ?",
        arrayOf(id.toString()),
      )
    }
  }
}

private fun BudgetSettings.toValues() =
  ContentValues(6).apply {
    put("period", period.key)
    put("budget_minutes", budgetMinutes)
    put("rollover_ceiling", rolloverCeiling)
    put("borrow_cap", borrowCap)
  }

private inline fun <T> Cursor.map(transform: (Cursor) -> T): List<T> {
  val items = ArrayList<T>(count)
  while (moveToNext()) items.add(transform(this))
  return items
}

private fun Cursor.long(column: String): Long = getLong(getColumnIndexOrThrow(column))

private fun Cursor.int(column: String): Int = getInt(getColumnIndexOrThrow(column))

private fun Cursor.string(column: String): String = getString(getColumnIndexOrThrow(column))

private fun Cursor.longOrNull(column: String): Long? {
  val index = getColumnIndexOrThrow(column)
  return if (isNull(index)) null else getLong(index)
}

private fun Cursor.stringOrNull(column: String): String? {
  val index = getColumnIndexOrThrow(column)
  return if (isNull(index)) null else getString(index)
}

private fun Cursor.toBudget() =
  BudgetRow(
    id = long("id"),
    kind = BudgetKind.from(string("kind")),
    name = stringOrNull("name"),
    settings =
      BudgetSettings(
        period = BudgetPeriod.from(string("period")),
        budgetMinutes = int("budget_minutes"),
        rolloverCeiling = int("rollover_ceiling"),
        borrowCap = int("borrow_cap"),
      ),
    createdAt = long("created_at"),
    updatedAt = long("updated_at"),
  )

private fun Cursor.toBudgetApp() =
  BudgetAppRow(
    packageName = string("package_name"),
    budgetId = long("budget_id"),
    appName = string("app_name"),
    iconVersion = long("icon_version"),
    addedAt = long("added_at"),
  )

private fun Cursor.toPeriod() =
  PeriodRow(
    id = long("id"),
    budgetId = long("budget_id"),
    period = BudgetPeriod.from(string("period")),
    startDay = string("start_day"),
    endDay = string("end_day"),
    openedAt = long("opened_at"),
    closedAt = longOrNull("closed_at"),
    budgetMinutes = int("budget_minutes"),
    repaidMs = long("repaid_ms"),
    bankedInMs = long("banked_in_ms"),
    usedMs = longOrNull("used_ms"),
    bankedOutMs = longOrNull("banked_out_ms"),
    lowAlertAt = longOrNull("low_alert_at"),
  )

private fun Cursor.toBorrow() =
  BorrowRow(
    id = long("id"),
    budgetId = long("budget_id"),
    periodId = long("period_id"),
    amountMs = long("amount_ms"),
    repaidMs = long("repaid_ms"),
    createdAt = long("created_at"),
    clearedAt = longOrNull("cleared_at"),
  )
