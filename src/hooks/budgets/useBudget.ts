import { useCallback } from "react";
import type { SQLiteDatabase } from "expo-sqlite";
import { getBudget } from "../../budgets/repository";
import type { AppBudget } from "../../budgets/types";
import { useBudgetQuery } from "./useBudgetQuery";

// Loads one app's budget; `budget` is null when the app has none.
export function useBudget(packageName: string) {
  const load = useCallback(
    (db: SQLiteDatabase) => getBudget(db, packageName),
    [packageName],
  );
  const { data, status, reload } = useBudgetQuery<AppBudget | null>(load, null);

  return { budget: data, status, reload };
}
