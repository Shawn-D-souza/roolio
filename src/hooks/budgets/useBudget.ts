import { useCallback } from "react";
import { getBudget } from "../../budgets/repository";
import type { BudgetWithUsage } from "../../budgets/types";
import { useBudgetQuery } from "./useBudgetQuery";

// Loads one app's budget and usage; `budget` is null when the app has none.
export function useBudget(packageName: string) {
  const load = useCallback(() => getBudget(packageName), [packageName]);
  const { data, status, reload } = useBudgetQuery<BudgetWithUsage | null>(
    load,
    null,
  );

  return { budget: data, status, reload };
}
