import {
  getPeriodUsage,
  MONDAY,
  syncTrackedApps,
  type PeriodUsage,
} from "../../modules/roolio-usage";
import { availableMinutes, usedMinutesFromMs } from "../budgets/rules";
import type { AppBudget, BudgetWithUsage } from "../budgets/types";

// TODO(settings): use the user's choice once Settings has it (PRD §8.6).
const FIRST_DAY_OF_WEEK = MONDAY;

/** Sends every budget to the native tracker, which starts or stops its service to match. */
export function syncTracking(budgets: readonly AppBudget[]) {
  return syncTrackedApps(
    budgets.map(({ packageName, period }) => ({ packageName, period })),
    FIRST_DAY_OF_WEEK,
  );
}

/**
 * Reads the latest usage. A failed read shows 0 rather than hiding the
 * budgets; the next read (on focus or after an edit) tries again.
 */
export async function readUsage(): Promise<PeriodUsage> {
  try {
    return await getPeriodUsage();
  } catch {
    return {};
  }
}

export function withUsage(
  budget: AppBudget,
  usage: PeriodUsage,
): BudgetWithUsage {
  const usedMinutes = usedMinutesFromMs(usage[budget.packageName] ?? 0);
  return {
    ...budget,
    usedMinutes,
    availableMinutes: availableMinutes(budget.budgetMinutes, usedMinutes),
  };
}
