import { useCallback } from "react";
import type { SQLiteDatabase } from "expo-sqlite";
import { getBudget } from "../../budgets/repository";
import type { BudgetWithUsage } from "../../budgets/types";
import { readUsage, withUsage } from "../../usage/tracking";
import { useBudgetQuery } from "./useBudgetQuery";

// Loads one app's budget and usage; `budget` is null when the app has none.
export function useBudget(packageName: string) {
  const load = useCallback(
    async (db: SQLiteDatabase) => {
      const budget = await getBudget(db, packageName);
      if (!budget) return null;
      return withUsage(budget, await readUsage());
    },
    [packageName],
  );
  const { data, status, reload } = useBudgetQuery<BudgetWithUsage | null>(
    load,
    null,
  );

  return { budget: data, status, reload };
}
