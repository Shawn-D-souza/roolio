package expo.modules.roolio.core.db

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.io.File

private const val DATABASE_NAME = "roolio.db"

/*
 * Ordered schema migrations. Entry `i` upgrades the database from version `i`
 * to `i + 1`. Never edit a shipped migration; append a new one.
 *
 * Android 7 ships SQLite 3.9, so no UPSERT (3.24), STRICT tables (3.37) or
 * ALTER TABLE RENAME COLUMN (3.25).
 *
 * Conventions: timestamps are epoch ms. Durations measured from usage are ms
 * (`_ms`); the budget the user sets is whole minutes (`budget_minutes`). Days
 * are device-local dates as "YYYY-MM-DD" (see Periods.dayKey), so they sort in
 * date order and keep one period per local date when the time zone changes.
 */
private val MIGRATIONS: List<List<String>> =
  listOf(
    listOf(
      // App-wide preferences and state, e.g. the first day of the week.
      """
      CREATE TABLE settings (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      ) WITHOUT ROWID
      """,
      // A budget for one app, a group of apps, or the whole phone.
      """
      CREATE TABLE budgets (
        id               INTEGER PRIMARY KEY,
        kind             TEXT NOT NULL CHECK (kind IN ('app', 'group', 'total')),
        -- The group's name; NULL for app and total budgets.
        name             TEXT,
        period           TEXT NOT NULL CHECK (period IN ('day', 'week', 'month')),
        budget_minutes   INTEGER NOT NULL CHECK (budget_minutes > 0),
        -- Most banked time, in periods of this budget.
        rollover_ceiling INTEGER NOT NULL CHECK (rollover_ceiling BETWEEN 0 AND 7),
        -- Most future periods borrowed at once.
        borrow_cap       INTEGER NOT NULL CHECK (borrow_cap BETWEEN 0 AND 7),
        created_at       INTEGER NOT NULL,
        updated_at       INTEGER NOT NULL,
        CHECK ((kind = 'group') = (name IS NOT NULL))
      )
      """,
      "CREATE UNIQUE INDEX budgets_single_total ON budgets (kind) WHERE kind = 'total'",
      // The apps a budget limits. An app is in at most one budget; the
      // total budget has no rows here because it covers every non-exempt app.
      """
      CREATE TABLE budget_apps (
        package_name TEXT PRIMARY KEY NOT NULL,
        budget_id    INTEGER NOT NULL REFERENCES budgets (id) ON DELETE CASCADE,
        app_name     TEXT NOT NULL,
        -- The app's last update time, used to key its cached icon.
        icon_version INTEGER NOT NULL,
        added_at     INTEGER NOT NULL
      )
      """,
      "CREATE INDEX budget_apps_by_budget ON budget_apps (budget_id)",
      // One row per budget per period: the ledger and its history.
      // The open row (closed_at NULL) is the current period.
      """
      CREATE TABLE periods (
        id             INTEGER PRIMARY KEY,
        budget_id      INTEGER NOT NULL REFERENCES budgets (id) ON DELETE CASCADE,
        period         TEXT NOT NULL CHECK (period IN ('day', 'week', 'month')),
        start_day      TEXT NOT NULL,
        -- The next period's start_day (exclusive).
        end_day        TEXT NOT NULL,
        opened_at      INTEGER NOT NULL,
        -- When the period ended: at its reset, or early on a period change.
        closed_at      INTEGER,
        -- The budget setting, kept in step with edits while open.
        budget_minutes INTEGER NOT NULL CHECK (budget_minutes > 0),
        -- 1 if this period was borrowed earlier, so its own budget is 0.
        borrowed       INTEGER NOT NULL DEFAULT 0 CHECK (borrowed IN (0, 1)),
        -- Minutes owed after a period change, taken from this budget.
        repaid_ms      INTEGER NOT NULL DEFAULT 0 CHECK (repaid_ms >= 0),
        -- Banked time carried in at the start.
        banked_in_ms   INTEGER NOT NULL DEFAULT 0 CHECK (banked_in_ms >= 0),
        -- Final usage and banked time carried out; NULL while open.
        used_ms        INTEGER CHECK (used_ms >= 0),
        banked_out_ms  INTEGER CHECK (banked_out_ms >= 0),
        -- When the "5 minutes left" alert was sent, at most once.
        low_alert_at   INTEGER,
        CHECK (start_day < end_day),
        CHECK ((closed_at IS NULL) = (used_ms IS NULL)),
        CHECK ((closed_at IS NULL) = (banked_out_ms IS NULL))
      )
      """,
      "CREATE UNIQUE INDEX periods_single_open ON periods (budget_id) WHERE closed_at IS NULL",
      "CREATE INDEX periods_by_start ON periods (budget_id, start_day)",
      // Each borrow of an upcoming period's budget. A borrow is
      // outstanding until fully repaid or cleared.
      """
      CREATE TABLE borrows (
        id         INTEGER PRIMARY KEY,
        budget_id  INTEGER NOT NULL REFERENCES budgets (id) ON DELETE CASCADE,
        -- The period its minutes were added to.
        period_id  INTEGER NOT NULL REFERENCES periods (id) ON DELETE CASCADE,
        -- The start_day of the period taken. NULL once kept as minutes owed
        -- across a period change.
        target_day TEXT,
        -- Fixed at the moment of borrowing.
        amount_ms  INTEGER NOT NULL CHECK (amount_ms > 0),
        repaid_ms  INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        -- Set by "Clear the borrowed".
        cleared_at INTEGER,
        CHECK (repaid_ms BETWEEN 0 AND amount_ms)
      )
      """,
      "CREATE INDEX borrows_by_budget ON borrows (budget_id)",
      "CREATE INDEX borrows_by_period ON borrows (period_id)",
      // Visible time per tracked app per local day. Removed with the app's budget.
      """
      CREATE TABLE daily_usage (
        package_name  TEXT NOT NULL,
        day           TEXT NOT NULL,
        foreground_ms INTEGER NOT NULL CHECK (foreground_ms >= 0),
        PRIMARY KEY (package_name, day)
      ) WITHOUT ROWID
      """,
      // The earliest time from which an app's daily rows are complete.
      """
      CREATE TABLE coverage (
        package_name TEXT PRIMARY KEY NOT NULL,
        covered_from INTEGER NOT NULL
      ) WITHOUT ROWID
      """,
      // Where the tracker resumes after the process is killed or the phone restarts.
      """
      CREATE TABLE tracker_state (
        id         INTEGER PRIMARY KEY CHECK (id = 0),
        checkpoint INTEGER NOT NULL,
        visible    TEXT
      )
      """,
    ),
  )

/**
 * Roolio's only database: budgets, their ledger, and usage, on this device
 * only. Native code owns it so the tracker, the pause screen and JS all read
 * and write one source of truth, in one transaction when needed.
 */
internal class RoolioDatabase private constructor(private val context: Context) :
  SQLiteOpenHelper(context, DATABASE_NAME, null, MIGRATIONS.size) {

  override fun onConfigure(db: SQLiteDatabase) {
    db.enableWriteAheadLogging()
    db.setForeignKeyConstraintsEnabled(true)
  }

  override fun onCreate(db: SQLiteDatabase) {
    onUpgrade(db, 0, MIGRATIONS.size)
    deleteLegacyData()
  }

  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    for (version in oldVersion until newVersion) {
      for (statement in MIGRATIONS[version]) db.execSQL(statement)
    }
  }

  // Data from before this database existed. Roolio was unreleased, so it's
  // dropped rather than migrated; usage is recounted from Android's history.
  private fun deleteLegacyData() {
    context.deleteDatabase("roolio_usage.db")
    context.deleteSharedPreferences("roolio_usage")
    val legacyJsDatabase = File(context.filesDir, "SQLite/roolio.db")
    for (suffix in listOf("", "-wal", "-shm", "-journal")) {
      File(legacyJsDatabase.path + suffix).delete()
    }
  }

  companion object {
    @Volatile private var instance: RoolioDatabase? = null

    fun get(context: Context): RoolioDatabase =
      instance
        ?: synchronized(this) {
          instance ?: RoolioDatabase(context.applicationContext).also { instance = it }
        }
  }
}
