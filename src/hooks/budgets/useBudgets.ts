import { useMemo } from "react";
import type { SQLiteDatabase } from "expo-sqlite";
import { listBudgets } from "../../budgets/repository";
import type { AppBudget } from "../../budgets/types";
import { useBudgetQuery } from "./useBudgetQuery";

const EMPTY: AppBudget[] = [];

// Least time first until usage is tracked, available time is the budget itself.
function byAvailableTime(a: AppBudget, b: AppBudget) {
  return (
    a.budgetMinutes - b.budgetMinutes ||
    a.appName.localeCompare(b.appName, undefined, { sensitivity: "base" })
  );
}

async function loadBudgets(db: SQLiteDatabase) {
  const budgets = await listBudgets(db);
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
