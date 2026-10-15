import { useMemo } from "react";
import type { SQLiteDatabase } from "expo-sqlite";
import { getUninstalledAsync } from "../../../modules/installed-apps";
import { deleteBudgets, listBudgets } from "../../budgets/repository";
import type { AppBudget, BudgetWithUsage } from "../../budgets/types";
import { readUsage, syncTracking, withUsage } from "../../usage/tracking";
import { useBudgetQuery } from "./useBudgetQuery";

const EMPTY: BudgetWithUsage[] = [];

// Least available time first.
function byAvailableTime(a: BudgetWithUsage, b: BudgetWithUsage) {
  return (
    a.availableMinutes - b.availableMinutes ||
    a.appName.localeCompare(b.appName, undefined, { sensitivity: "base" })
  );
}

// An uninstalled app's budget is removed. Deleting it re-syncs the
// tracker, which drops the app's usage history too.
async function removeUninstalled(db: SQLiteDatabase, budgets: AppBudget[]) {
  let uninstalled: string[];
  try {
    uninstalled = await getUninstalledAsync(
      budgets.map((budget) => budget.packageName),
    );
  } catch {
    // Only remove what was confirmed missing; try again on the next load.
    return budgets;
  }
  if (uninstalled.length === 0) return budgets;
  try {
    await deleteBudgets(db, uninstalled);
  } catch {
    return budgets;
  }
  const removed = new Set(uninstalled);
  return budgets.filter((budget) => !removed.has(budget.packageName));
}

async function loadBudgets(db: SQLiteDatabase) {
  const budgets = await removeUninstalled(db, await listBudgets(db));
  // Sync first so a just-added app is tracked, with its usage so far, before the read.
  await syncTracking(budgets).catch(() => undefined);
  const usage = await readUsage();
  return budgets
    .map((budget) => withUsage(budget, usage))
    .sort(byAvailableTime);
}

export function useBudgets() {
  const { data, status, reload } = useBudgetQuery(loadBudgets, EMPTY);

  const budgetedPackages = useMemo(
    () => new Set(data.map((budget) => budget.packageName)),
    [data],
  );

  return { budgets: data, budgetedPackages, status, reload };
}
