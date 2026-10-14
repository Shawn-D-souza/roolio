import type { SQLiteDatabase } from "expo-sqlite";

export const DATABASE_NAME = "roolio.db";

/**
 * Ordered schema migrations. Each entry upgrades the database from version
 * `index` to `index + 1`. Never edit a shipped migration; append a new one.
 */
const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE app_budgets (
    package_name             TEXT PRIMARY KEY NOT NULL,
    app_name                 TEXT NOT NULL,
    icon_version             INTEGER NOT NULL,
    period                   TEXT NOT NULL CHECK (period IN ('day', 'week', 'month')),
    budget_minutes           INTEGER NOT NULL CHECK (budget_minutes > 0),
    rollover_ceiling         INTEGER NOT NULL DEFAULT 1 CHECK (rollover_ceiling BETWEEN 0 AND 7),
    borrow_cap               INTEGER NOT NULL DEFAULT 1 CHECK (borrow_cap BETWEEN 0 AND 7),
    created_at               INTEGER NOT NULL,
    updated_at               INTEGER NOT NULL
  );
  `,
];

const DATABASE_VERSION = MIGRATIONS.length;

export async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync("PRAGMA journal_mode = WAL;");

  const row = await db.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version",
  );
  const currentVersion = row?.user_version ?? 0;
  if (currentVersion >= DATABASE_VERSION) return;

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (let version = currentVersion; version < DATABASE_VERSION; version++) {
      await txn.execAsync(MIGRATIONS[version]);
    }
    // PRAGMA does not accept bound parameters; the value is a trusted constant.
    await txn.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  });
}
