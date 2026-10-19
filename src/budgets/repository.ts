import * as native from "../../modules/roolio-core";
import type { BudgetRecord } from "../../modules/roolio-core";
import { notifyBudgetsChanged } from "./events";
import { normalizeSettings } from "./rules";
import type {
  BorrowedChoice,
  BudgetSettings,
  BudgetWithUsage,
  BudgetedApp,
} from "./types";

const MINUTE_MS = 60_000;

// The native ledger counts whole minutes, so this is an exact conversion, not
// a rounding decision.
function toMinutes(ms: number) {
  return Math.round(ms / MINUTE_MS);
}

function toBudgetWithUsage(record: BudgetRecord): BudgetWithUsage | null {
  const app = record.apps[0];
  if (record.kind !== "app" || !app) return null;
  const { current } = record;
  const ownBudgetMinutes = toMinutes(current.ownBudgetMs);
  return {
    ...app,
    id: record.id,
    period: record.period,
    budgetMinutes: record.budgetMinutes,
    rolloverCeiling: record.rolloverCeiling,
    borrowCap: record.borrowCap,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    usedMinutes: toMinutes(current.usedMs),
    availableMinutes: toMinutes(current.availableMs),
    // The rest of this period's budget went to paying back earlier borrowing.
    repaidMinutes: current.budgetMinutes - ownBudgetMinutes,
    ownBudgetMinutes,
    bankedInMinutes: toMinutes(current.bankedInMs),
    bankedMinutes: toMinutes(current.bankedMs),
    borrowedMinutes: toMinutes(current.borrowedMs),
    owedMinutes: toMinutes(current.owedMs),
    borrowLeftMinutes: toMinutes(current.borrowLeftMs),
    upcoming: current.upcoming.map((period) => ({
      startDay: period.startDay,
      budgetMinutes: toMinutes(period.budgetMs),
      takenMinutes: toMinutes(period.takenMs),
    })),
  };
}

/** Every app budget with its current period. */
export async function listBudgets(): Promise<BudgetWithUsage[]> {
  const records = await native.getBudgets();
  return records.flatMap((record) => toBudgetWithUsage(record) ?? []);
}

/** The budget of one app, or null if it has none. */
export async function getBudget(
  packageName: string,
): Promise<BudgetWithUsage | null> {
  const record = await native.getAppBudget(packageName);
  return record && toBudgetWithUsage(record);
}

// Adds a budget. It applies immediately.
export async function createBudget(app: BudgetedApp, settings: BudgetSettings) {
  await native.createAppBudget(app, normalizeSettings(settings));
  notifyBudgetsChanged();
}

// Removes budgets. It applies immediately.
export async function deleteBudgets(packageNames: readonly string[]) {
  if (packageNames.length === 0) return;
  await native.deleteAppBudgets([...packageNames]);
  notifyBudgetsChanged();
}

// Saves edits to a budget. Edits apply immediately.
export async function updateBudget(
  budgetId: number,
  settings: BudgetSettings,
  borrowedChoice: BorrowedChoice | null = null,
) {
  await native.updateBudget(
    budgetId,
    normalizeSettings(settings),
    borrowedChoice,
  );
  notifyBudgetsChanged();
}
