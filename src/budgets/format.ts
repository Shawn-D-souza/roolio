import type { BudgetPeriod } from "./types";

const PERIOD_LABEL: Record<BudgetPeriod, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
};

const PERIOD_NOUN: Record<BudgetPeriod, [singular: string, plural: string]> = {
  day: ["day", "days"],
  week: ["week", "weeks"],
  month: ["month", "months"],
};

// "45 min", "1h 30m", "10h".
export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

// "Daily", "Weekly", "Monthly".
export function periodLabel(period: BudgetPeriod) {
  return PERIOD_LABEL[period];
}

// "per day", "per week", "per month".
export function perPeriodLabel(period: BudgetPeriod) {
  return `per ${periodNoun(period)}`;
}

// "day" / "days", "week" / "weeks".
export function periodNoun(period: BudgetPeriod, count = 1) {
  const [singular, plural] = PERIOD_NOUN[period];
  return count === 1 ? singular : plural;
}

// "1 day", "3 weeks".
export function formatPeriods(count: number, period: BudgetPeriod) {
  return `${count} ${periodNoun(period, count)}`;
}

// Like `formatPeriods`, but 0 reads as "Off".
export function formatPeriodCount(count: number, period: BudgetPeriod) {
  return count === 0 ? "Off" : formatPeriods(count, period);
}
