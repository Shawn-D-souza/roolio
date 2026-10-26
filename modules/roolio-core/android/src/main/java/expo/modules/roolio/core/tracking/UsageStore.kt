package expo.modules.roolio.core.tracking

import android.content.ContentValues
import android.database.sqlite.SQLiteDatabase
import expo.modules.roolio.core.db.RoolioDatabase

// Where the tracker resumes after the process is killed or the phone restarts.
internal data class TrackerState(
  // Events before this time are already counted.
  val checkpoint: Long,
  // The apps visible at `checkpoint`, as written by Visibility.toJson.
  val visible: String?,
)

/** Daily foreground time per tracked app, in [RoolioDatabase]. */
internal class UsageStore(private val database: RoolioDatabase) {
  private val readableDatabase: SQLiteDatabase
    get() = database.readableDatabase

  private val writableDatabase: SQLiteDatabase
    get() = database.writableDatabase

  fun readState(): TrackerState? =
    readableDatabase
      .rawQuery(
        "SELECT checkpoint, visible FROM tracker_state WHERE id = 0",
        null,
      )
      .use { cursor ->
        if (!cursor.moveToFirst()) return null
        TrackerState(
          checkpoint = cursor.getLong(0),
          visible = if (cursor.isNull(1)) null else cursor.getString(1),
        )
      }

  /**
   * Adds `deltas` (day -> package -> ms) and saves `state` in one transaction,
   * so a crash can never count the same time twice or lose it.
   */
  fun commit(deltas: Map<String, Map<String, Long>>, state: TrackerState?) {
    val db = writableDatabase
    db.beginTransaction()
    try {
      addDeltas(db, deltas)
      if (state != null) {
        db.insertWithOnConflict(
          "tracker_state",
          null,
          ContentValues(3).apply {
            put("id", 0)
            put("checkpoint", state.checkpoint)
            put("visible", state.visible)
          },
          SQLiteDatabase.CONFLICT_REPLACE,
        )
      }
      db.setTransactionSuccessful()
    } finally {
      db.endTransaction()
    }
  }

  /** Adds backfilled time and marks the app's rows complete from `coveredFrom`. */
  fun commitBackfill(packageName: String, deltas: Map<String, Map<String, Long>>, coveredFrom: Long) {
    val db = writableDatabase
    db.beginTransaction()
    try {
      addDeltas(db, deltas)
      db.insertWithOnConflict(
        "coverage",
        null,
        ContentValues(2).apply {
          put("package_name", packageName)
          put("covered_from", coveredFrom)
        },
        SQLiteDatabase.CONFLICT_REPLACE,
      )
      db.setTransactionSuccessful()
    } finally {
      db.endTransaction()
    }
  }

  fun coveredFrom(packageName: String): Long? =
    readableDatabase
      .rawQuery("SELECT covered_from FROM coverage WHERE package_name = ?", arrayOf(packageName))
      .use { cursor -> if (cursor.moveToFirst()) cursor.getLong(0) else null }

  // Total foreground time of `packageNames` from `fromDay` up to `toDay`
  // (exclusive), or with no end when `toDay` is null.
  fun sumUsage(packageNames: Collection<String>, fromDay: String, toDay: String?): Long {
    if (packageNames.isEmpty()) return 0L
    val placeholders = packageNames.joinToString(", ") { "?" }
    val args = ArrayList<String>(packageNames.size + 2)
    args.addAll(packageNames)
    args.add(fromDay)
    if (toDay != null) args.add(toDay)
    return readableDatabase
      .rawQuery(
        "SELECT COALESCE(SUM(foreground_ms), 0) FROM daily_usage " +
          "WHERE package_name IN ($placeholders) AND day >= ?" +
          if (toDay != null) " AND day < ?" else "",
        args.toTypedArray(),
      )
      .use { cursor -> if (cursor.moveToFirst()) cursor.getLong(0) else 0L }
  }

  // Saved foreground time of `packageNames` per day from `fromDay` up to
  // `toDay` (exclusive), as day -> package -> ms.
  fun dailyUsage(packageNames: Collection<String>, fromDay: String, toDay: String): HashMap<String, HashMap<String, Long>> {
    val days = HashMap<String, HashMap<String, Long>>()
    if (packageNames.isEmpty()) return days
    val placeholders = packageNames.joinToString(", ") { "?" }
    val args = ArrayList<String>(packageNames.size + 2)
    args.addAll(packageNames)
    args.add(fromDay)
    args.add(toDay)
    readableDatabase
      .rawQuery(
        "SELECT day, package_name, foreground_ms FROM daily_usage " +
          "WHERE package_name IN ($placeholders) AND day >= ? AND day < ?",
        args.toTypedArray(),
      )
      .use { cursor ->
        while (cursor.moveToNext()) {
          days.getOrPut(cursor.getString(0)) { HashMap() }[cursor.getString(1)] = cursor.getLong(2)
        }
      }
    return days
  }

  fun deletePackages(packageNames: Collection<String>) {
    if (packageNames.isEmpty()) return
    val db = writableDatabase
    db.beginTransaction()
    try {
      for (packageName in packageNames) {
        val args = arrayOf(packageName)
        db.delete("daily_usage", "package_name = ?", args)
        db.delete("coverage", "package_name = ?", args)
      }
      db.setTransactionSuccessful()
    } finally {
      db.endTransaction()
    }
  }

  private fun addDeltas(db: SQLiteDatabase, deltas: Map<String, Map<String, Long>>) {
    if (deltas.isEmpty()) return
    // UPDATE then INSERT, because UPSERT needs SQLite 3.24 and Android 7 ships 3.9.
    val update =
      db.compileStatement(
        "UPDATE daily_usage SET foreground_ms = foreground_ms + ? WHERE package_name = ? AND day = ?"
      )
    val insert =
      db.compileStatement("INSERT INTO daily_usage (foreground_ms, package_name, day) VALUES (?, ?, ?)")
    try {
      for ((day, byPackage) in deltas) {
        for ((packageName, ms) in byPackage) {
          if (ms <= 0) continue
          update.bindLong(1, ms)
          update.bindString(2, packageName)
          update.bindString(3, day)
          if (update.executeUpdateDelete() == 0) {
            insert.bindLong(1, ms)
            insert.bindString(2, packageName)
            insert.bindString(3, day)
            insert.executeInsert()
          }
        }
      }
    } finally {
      update.close()
      insert.close()
    }
  }
}
