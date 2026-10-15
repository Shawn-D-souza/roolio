import { useMemo } from "react";
import { getUninstalledAsync } from "../../../modules/installed-apps";
import { deleteBudgets, listBudgets } from "../../budgets/repository";
import type { BudgetWithUsage } from "../../budgets/types";
import { useBudgetQuery } from "./useBudgetQuery";

const EMPTY: BudgetWithUsage[] = [];

// Least available time first.
function byAvailableTime(a: BudgetWithUsage, b: BudgetWithUsage) {
  return (
    a.availableMinutes - b.availableMinutes ||
    a.appName.localeCompare(b.appName, undefined, { sensitivity: "base" })
  );
}

// An uninstalled app's budget is removed, with its history.
async function removeUninstalled(budgets: BudgetWithUsage[]) {
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
    await deleteBudgets(uninstalled);
  } catch {
    return budgets;
  }
  const removed = new Set(uninstalled);
  return budgets.filter((budget) => !removed.has(budget.packageName));
}

async function loadBudgets() {
  const budgets = await removeUninstalled(await listBudgets());
  return budgets.sort(byAvailableTime);
}

export function useBudgets() {
  const { data, status, reload } = useBudgetQuery(loadBudgets, EMPTY);

  const budgetedPackages = useMemo(
    () => new Set(data.map((budget) => budget.packageName)),
    [data],
  );

  return { budgets: data, budgetedPackages, status, reload };
}
