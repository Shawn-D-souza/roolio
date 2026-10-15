package expo.modules.roolio.usage

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

private const val DATABASE_NAME = "roolio_usage.db"
// 3: counts visible time per activity (PiP, split-screen, dialogs from other
// apps). Usage counted by older versions is dropped and recounted.
private const val DATABASE_VERSION = 3

// Where the tracker resumes after the process is killed or the phone restarts.
internal data class TrackerState(
  // Events before this time are already counted.
  val checkpoint: Long,
  // The apps visible at `checkpoint`, as written by Visibility.toJson.
  val visible: String?,
)

/**
 * Daily foreground time per tracked app, on this device only.
 *
 * This is its own file, opened with Android's SQLite, and is never shared with
 * the JS database: two SQLite libraries in one process can't safely lock the
 * same file.
 */
internal class UsageStore(context: Context) :
  SQLiteOpenHelper(context.applicationContext, DATABASE_NAME, null, DATABASE_VERSION) {

  override fun onConfigure(db: SQLiteDatabase) {
    db.enableWriteAheadLogging()
  }

  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL(
      """
      CREATE TABLE daily_usage (
        day           TEXT NOT NULL,
        package_name  TEXT NOT NULL,
        foreground_ms INTEGER NOT NULL,
        PRIMARY KEY (package_name, day)
      ) WITHOUT ROWID
      """
    )
    // The earliest time from which an app's daily rows are complete.
    db.execSQL(
      """
      CREATE TABLE coverage (
        package_name TEXT PRIMARY KEY NOT NULL,
        covered_from INTEGER NOT NULL
      )
      """
    )
    db.execSQL(
      """
      CREATE TABLE tracker_state (
        id         INTEGER PRIMARY KEY CHECK (id = 0),
        checkpoint INTEGER NOT NULL,
        visible    TEXT
      )
      """
    )
  }

  // Older versions undercounted: version 1 ended a session when any of the
  // app's activities stopped, and version 2 when it was covered without being
  // hidden. Their numbers can't be fixed in place, so they're dropped and the
  // tracker recounts each app from Android's own history
  // (see UsageTracker.backfillIfNeeded).
  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    if (oldVersion < 3) {
      db.execSQL("DROP TABLE IF EXISTS daily_usage")
      db.execSQL("DROP TABLE IF EXISTS coverage")
      db.execSQL("DROP TABLE IF EXISTS tracker_state")
      onCreate(db)
    }
  }

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

  // Total foreground time of `packageName` on `fromDay` and later.
  fun sumSince(packageName: String, fromDay: String): Long =
    readableDatabase
      .rawQuery(
        "SELECT COALESCE(SUM(foreground_ms), 0) FROM daily_usage WHERE package_name = ? AND day >= ?",
        arrayOf(packageName, fromDay),
      )
      .use { cursor -> if (cursor.moveToFirst()) cursor.getLong(0) else 0L }

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
