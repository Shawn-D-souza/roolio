import type { SQLiteDatabase } from "expo-sqlite";
import { notifyBudgetsChanged } from "./events";
import { normalizeSettings } from "./rules";
import type {
  AppBudget,
  BudgetPeriod,
  BudgetSettings,
  BudgetedApp,
} from "./types";

export const BUDGETS_TABLE = "app_budgets";

type BudgetRow = {
  package_name: string;
  app_name: string;
  icon_version: number;
  period: BudgetPeriod;
  budget_minutes: number;
  rollover_ceiling: number;
  borrow_cap: number;
  created_at: number;
  updated_at: number;
};

function toAppBudget(row: BudgetRow): AppBudget {
  return {
    packageName: row.package_name,
    appName: row.app_name,
    iconVersion: row.icon_version,
    period: row.period,
    budgetMinutes: row.budget_minutes,
    rolloverCeiling: row.rollover_ceiling,
    borrowCap: row.borrow_cap,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listBudgets(db: SQLiteDatabase): Promise<AppBudget[]> {
  const rows = await db.getAllAsync<BudgetRow>(
    `SELECT * FROM ${BUDGETS_TABLE}`,
  );
  return rows.map(toAppBudget);
}

export async function getBudget(
  db: SQLiteDatabase,
  packageName: string,
): Promise<AppBudget | null> {
  const row = await db.getFirstAsync<BudgetRow>(
    `SELECT * FROM ${BUDGETS_TABLE} WHERE package_name = ?`,
    packageName,
  );
  return row ? toAppBudget(row) : null;
}

// Adds a budget. It applies immediately.
export async function createBudget(
  db: SQLiteDatabase,
  app: BudgetedApp,
  settings: BudgetSettings,
  now: number = Date.now(),
) {
  const values = normalizeSettings(settings);
  await db.runAsync(
    `INSERT INTO ${BUDGETS_TABLE} (
       package_name, app_name, icon_version, period, budget_minutes,
       rollover_ceiling, borrow_cap, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    app.packageName,
    app.appName,
    app.iconVersion,
    values.period,
    values.budgetMinutes,
    values.rolloverCeiling,
    values.borrowCap,
    now,
    now,
  );
  notifyBudgetsChanged();
}

// Saves edits to a budget. Edits apply immediately
export async function updateBudget(
  db: SQLiteDatabase,
  packageName: string,
  settings: BudgetSettings,
  now: number = Date.now(),
) {
  const values = normalizeSettings(settings);
  const result = await db.runAsync(
    `UPDATE ${BUDGETS_TABLE} SET
       period = ?, budget_minutes = ?, rollover_ceiling = ?, borrow_cap = ?,
       updated_at = ?
     WHERE package_name = ?`,
    values.period,
    values.budgetMinutes,
    values.rolloverCeiling,
    values.borrowCap,
    now,
    packageName,
  );
  if (result.changes === 0) {
    throw new Error(`No budget found for "${packageName}"`);
  }
  notifyBudgetsChanged();
}
