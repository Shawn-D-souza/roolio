import type { DailyUsage, StatsPeriod } from "../../modules/roolio-core";
import type { BudgetPeriod, BudgetWithUsage } from "../budgets/types";
import {
  dayKey,
  daysIn,
  fitsIn,
  periodStart,
  type StatsRange,
} from "./ranges";

const MINUTE_MS = 60_000;

// The native ledger counts whole minutes, so this is an exact conversion.
function toMinutes(ms: number) {
  return Math.round(ms / MINUTE_MS);
}

// How many apps get a color of their own in the charts; the rest share one.
export const MAX_SERIES = 3;
// The key of the slice the apps without a color of their own share.
export const OTHER_APPS = "other";

// Part of a day's time: one colored app, or every other app together.
export type DaySegment = {
  // A package name, or OTHER_APPS.
  key: string;
  minutes: number;
};

export type ChartDay = {
  day: string;
  minutes: number;
  // The day's time split by app, in `series` order with OTHER_APPS last.
  // Only apps that used time.
  segments: DaySegment[];
  // False before Roolio counted any budgeted app, and after today: there's
  // no data, so no bar, and the day isn't in the average.
  tracked: boolean;
};

// One app's numbers for a range, in whole minutes.
export type AppStats = {
  packageName: string;
  appName: string;
  iconVersion: number;
  usedMinutes: number;
  // What the bank gained at each reset in the range.
  bankedMinutes: number;
  // Time used past a period's own time, taken from upcoming periods.
  borrowedMinutes: number;
  // Earlier borrowing that periods in the range paid back.
  repaidMinutes: number;
};

export type Stats = {
  range: StatsRange;
  today: string;
  // A java.util.Calendar day: 1 is Sunday, 2 Monday.
  firstDayOfWeek: number;
  // The earliest day any budget could have counted: the start of the period
  // the oldest budget was added in. There's nothing to see before it.
  firstDay: string;
  // The first day Roolio counted any budgeted app.
  trackedFrom: string;
  // False when the whole range is before Roolio counted anything.
  hasData: boolean;
  chart: ChartDay[];
  // Every budgeted app, most used first.
  apps: AppStats[];
  // The apps with a color of their own, most used over the chart's days
  // first, so an app keeps its color while you pick days in its week.
  series: string[];
  usedMinutes: number;
  // Per day, over the tracked days of the range; null when it has none.
  averageMinutes: number | null;
  bankedMinutes: number;
  borrowedMinutes: number;
  repaidMinutes: number;
  // Budget periods too long to count in this range, e.g. "week" in a day.
  longerPeriods: BudgetPeriod[];
};

// Banking happens at a reset, so only closed periods have banked anything:
// what they carried out, less what they carried in.
function bankedMs(period: StatsPeriod) {
  if (period.bankedOutMs == null) return 0;
  return Math.max(0, period.bankedOutMs - period.bankedInMs);
}

/**
 * Puts the numbers of a range together. `usage` covers the chart's days, a
 * superset of the range. A budget period counts toward the range when it
 * starts in it and is no longer than it, so a week of a weekly budget never
 * shows up in one day.
 */
export function summarize({
  range,
  chartRange,
  today,
  firstDayOfWeek,
  budgets,
  usage,
  periods,
}: {
  range: StatsRange;
  chartRange: StatsRange;
  today: string;
  firstDayOfWeek: number;
  budgets: BudgetWithUsage[];
  usage: DailyUsage[];
  periods: StatsPeriod[];
}): Stats {
  const byDay = new Map<string, number>();
  const byDayAndApp = new Map<string, Map<string, number>>();
  const chartTotals = new Map<string, number>();
  const byApp = new Map<string, AppStats>();
  for (const budget of budgets) {
    byApp.set(budget.packageName, {
      packageName: budget.packageName,
      appName: budget.appName,
      iconVersion: budget.iconVersion,
      usedMinutes: 0,
      bankedMinutes: 0,
      borrowedMinutes: 0,
      repaidMinutes: 0,
    });
  }

  for (const entry of usage) {
    const app = byApp.get(entry.packageName);
    if (!app) continue;
    const minutes = toMinutes(entry.usedMs);
    byDay.set(entry.day, (byDay.get(entry.day) ?? 0) + minutes);
    if (minutes > 0) {
      const forDay = byDayAndApp.get(entry.day) ?? new Map<string, number>();
      forDay.set(entry.packageName, (forDay.get(entry.packageName) ?? 0) + minutes);
      byDayAndApp.set(entry.day, forDay);
      chartTotals.set(
        entry.packageName,
        (chartTotals.get(entry.packageName) ?? 0) + minutes,
      );
    }
    if (entry.day >= range.fromDay && entry.day < range.toDay) {
      app.usedMinutes += minutes;
    }
  }

  const appByBudget = new Map<number, AppStats>();
  for (const budget of budgets) {
    const app = byApp.get(budget.packageName);
    if (app) appByBudget.set(budget.id, app);
  }
  for (const period of periods) {
    const app = appByBudget.get(period.budgetId);
    if (
      !app ||
      period.startDay < range.fromDay ||
      period.startDay >= range.toDay ||
      !fitsIn(period.period, range.kind)
    ) {
      continue;
    }
    app.bankedMinutes += toMinutes(bankedMs(period));
    app.borrowedMinutes += toMinutes(period.borrowedMs);
    app.repaidMinutes += toMinutes(period.repaidMs);
  }

  const apps = [...byApp.values()].sort(
    (a, b) =>
      b.usedMinutes - a.usedMinutes ||
      a.appName.localeCompare(b.appName, undefined, { sensitivity: "base" }),
  );
  const sum = (pick: (app: AppStats) => number) =>
    apps.reduce((total, app) => total + pick(app), 0);

  // The first day with data: when the oldest budget was added, or earlier
  // when a budget counted its period's time from before then.
  let trackedFrom = today;
  for (const budget of budgets) {
    const added = dayKey(new Date(budget.createdAt));
    if (added < trackedFrom) trackedFrom = added;
  }
  for (const day of byDay.keys()) {
    if (day < trackedFrom) trackedFrom = day;
  }
  const isTracked = (day: string) => day >= trackedFrom && day <= today;

  let firstDay = trackedFrom;
  for (const budget of budgets) {
    const start = periodStart(
      budget.period,
      dayKey(new Date(budget.createdAt)),
      firstDayOfWeek,
    );
    if (start < firstDay) firstDay = start;
  }

  const series = [...chartTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_SERIES)
    .map(([packageName]) => packageName);
  const segmentsOf = (day: string): DaySegment[] => {
    const forDay = byDayAndApp.get(day);
    if (!forDay) return [];
    const segments: DaySegment[] = [];
    let other = 0;
    for (const [packageName, minutes] of forDay) {
      if (!series.includes(packageName)) other += minutes;
    }
    for (const packageName of series) {
      const minutes = forDay.get(packageName);
      if (minutes) segments.push({ key: packageName, minutes });
    }
    if (other > 0) segments.push({ key: OTHER_APPS, minutes: other });
    return segments;
  };

  const usedMinutes = sum((app) => app.usedMinutes);
  const trackedDays = daysIn(range).filter(isTracked).length;

  return {
    range,
    today,
    firstDayOfWeek,
    firstDay,
    trackedFrom,
    hasData: trackedDays > 0,
    chart: daysIn(chartRange).map((day) => ({
      day,
      minutes: byDay.get(day) ?? 0,
      segments: segmentsOf(day),
      tracked: isTracked(day),
    })),
    apps,
    series,
    usedMinutes,
    averageMinutes:
      trackedDays > 0 ? Math.round(usedMinutes / trackedDays) : null,
    bankedMinutes: sum((app) => app.bankedMinutes),
    borrowedMinutes: sum((app) => app.borrowedMinutes),
    repaidMinutes: sum((app) => app.repaidMinutes),
    longerPeriods: (["week", "month"] as const).filter(
      (period) =>
        !fitsIn(period, range.kind) &&
        budgets.some((budget) => budget.period === period),
    ),
  };
}
