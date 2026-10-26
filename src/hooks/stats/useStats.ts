import { useCallback } from "react";
import type { BudgetPeriod } from "../../budgets/types";
import { loadStats } from "../../stats/repository";
import type { Stats } from "../../stats/summary";
import { useBudgetQuery } from "../budgets/useBudgetQuery";

/**
 * The stats of the day, week or month `stepsBack` before the current one.
 * While another range loads, the last one stays on screen.
 */
export function useStats(kind: BudgetPeriod, stepsBack: number) {
  const load = useCallback(
    () => loadStats(kind, stepsBack),
    [kind, stepsBack],
  );
  const { data, status, reload } = useBudgetQuery<Stats | null>(load, null);
  return { stats: data, status, reload };
}
