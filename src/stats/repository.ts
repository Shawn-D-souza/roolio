import * as native from "../../modules/roolio-core";
import type { BudgetPeriod } from "../budgets/types";
import { listBudgets } from "../budgets/repository";
import { chartRange, dayKey, rangeFor } from "./ranges";
import { summarize, type Stats } from "./summary";

/**
 * The stats of the day, week or month `stepsBack` before the current one,
 * for every budgeted app. Reads the chart's days too: a day comes with its
 * week.
 */
export async function loadStats(
  kind: BudgetPeriod,
  stepsBack: number,
): Promise<Stats> {
  const today = dayKey(new Date());
  const firstDayOfWeek = await native.getFirstDayOfWeek();
  const range = rangeFor(kind, stepsBack, firstDayOfWeek, today);
  const chart = chartRange(range, firstDayOfWeek);
  const [budgets, stats] = await Promise.all([
    listBudgets(),
    native.getStats(chart.fromDay, chart.toDay),
  ]);
  return summarize({
    range,
    chartRange: chart,
    today,
    firstDayOfWeek,
    budgets,
    usage: stats.usage,
    periods: stats.periods,
  });
}
