import { formatDuration, periodLabel } from "./format";
import type { BudgetPeriod, BudgetSettings } from "./types";

export const MIN_BUDGET_MINUTES = 1;
export const MAX_PERIOD_COUNT = 7;
// At or below this many minutes left, a budget reads as running low (PRD §8.5).
export const LOW_TIME_MINUTES = 5;

const HOUR = 60;
const DAY = 24 * HOUR;

const PERIOD_DAYS: Record<BudgetPeriod, number> = {
  day: 1,
  week: 7,
  month: 30,
};

const MAX_BUDGET_MINUTES: Record<BudgetPeriod, number> = {
  day: DAY,
  week: 7 * DAY,
  month: 31 * DAY,
};

const DEFAULT_BUDGET_MINUTES: Record<BudgetPeriod, number> = {
  day: HOUR,
  week: 10 * HOUR,
  month: 40 * HOUR,
};

const BUDGET_PRESETS: Record<BudgetPeriod, readonly number[]> = {
  day: [15, 30, HOUR, 2 * HOUR],
  week: [3 * HOUR, 5 * HOUR, 10 * HOUR, 20 * HOUR],
  month: [10 * HOUR, 20 * HOUR, 40 * HOUR, 80 * HOUR],
};

// The −/+ step never changes with the value, only with the period.
const BUDGET_STEP: Record<BudgetPeriod, number> = {
  day: 5,
  week: 30,
  month: HOUR,
};

export function maxBudget(period: BudgetPeriod) {
  return MAX_BUDGET_MINUTES[period];
}

export function defaultBudget(period: BudgetPeriod) {
  return DEFAULT_BUDGET_MINUTES[period];
}

export function budgetPresets(period: BudgetPeriod) {
  return BUDGET_PRESETS[period];
}

export function defaultSettings(): BudgetSettings {
  return {
    period: "day",
    budgetMinutes: defaultBudget("day"),
    rolloverCeiling: 1,
    borrowCap: 1,
  };
}

export function budgetStep(period: BudgetPeriod) {
  return BUDGET_STEP[period];
}

export function clampBudget(minutes: number, period: BudgetPeriod) {
  const whole = Math.round(minutes);
  return Math.min(Math.max(whole, MIN_BUDGET_MINUTES), maxBudget(period));
}

// Exact values (e.g. 1h 7m) are kept; −/+ moves them by a fixed step.
export function incrementBudget(minutes: number, period: BudgetPeriod) {
  return clampBudget(minutes + budgetStep(period), period);
}

export function decrementBudget(minutes: number, period: BudgetPeriod) {
  return clampBudget(minutes - budgetStep(period), period);
}

// Explains how an out-of-range typed budget will be clamped, or null if it's within range.
export function budgetLimitHint(minutes: number, period: BudgetPeriod) {
  if (minutes < MIN_BUDGET_MINUTES) {
    return `Minimum is ${formatDuration(MIN_BUDGET_MINUTES)}`;
  }
  if (minutes > maxBudget(period)) {
    return `${periodLabel(period)} max is ${formatDuration(maxBudget(period))}`;
  }
  return null;
}

// Converts a budget between periods, keeping the same amount per day.
export function convertBudget(
  minutes: number,
  from: BudgetPeriod,
  to: BudgetPeriod,
) {
  if (from === to) return minutes;
  const converted = (minutes / PERIOD_DAYS[from]) * PERIOD_DAYS[to];
  const step = budgetStep(to);
  return clampBudget(Math.round(converted / step) * step, to);
}

// Whole minutes used, rounded down so a budget never reads as used up early.
export function usedMinutesFromMs(ms: number) {
  return Math.max(0, Math.floor(ms / 60_000));
}

/* Minutes still available this period (PRD §6.2). Never below 0.
 * TODO(ledger): add banked time and minutes gained by borrowing, and use 0 as
 * the budget in a borrowed period, once banking and borrowing are built. */
export function availableMinutes(budgetMinutes: number, usedMinutes: number) {
  return Math.max(0, budgetMinutes - usedMinutes);
}

export type TimeLeftState = "ok" | "low" | "out";

export function timeLeftState(available: number): TimeLeftState {
  if (available <= 0) return "out";
  return available <= LOW_TIME_MINUTES ? "low" : "ok";
}

export function clampPeriodCount(count: number) {
  return Math.min(Math.max(Math.round(count), 0), MAX_PERIOD_COUNT);
}

// Returns settings coerced into valid ranges, safe to persist.
export function normalizeSettings(settings: BudgetSettings): BudgetSettings {
  return {
    period: settings.period,
    budgetMinutes: clampBudget(settings.budgetMinutes, settings.period),
    rolloverCeiling: clampPeriodCount(settings.rolloverCeiling),
    borrowCap: clampPeriodCount(settings.borrowCap),
  };
}

export function settingsEqual(a: BudgetSettings, b: BudgetSettings) {
  return (
    a.period === b.period &&
    a.budgetMinutes === b.budgetMinutes &&
    a.rolloverCeiling === b.rolloverCeiling &&
    a.borrowCap === b.borrowCap
  );
}
