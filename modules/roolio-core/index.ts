import RoolioCoreModule from "./src/RoolioCoreModule";
import type {
  BorrowedChoice,
  BudgetApp,
  BudgetPeriod,
  BudgetSettings,
  RememberedTab,
  ScreenMemory,
  StatsChartView,
  ThemeMode,
} from "./src/RoolioCore.types";

export type * from "./src/RoolioCore.types";

/** java.util.Calendar day numbers, used for `setFirstDayOfWeek`. */
export const SUNDAY = 1;
export const MONDAY = 2;

/*
 * Budgets, their ledger (banked and borrowed time) and usage live in one
 * native database, so the tracker and the pause screen can enforce them
 * without JS. Every read rolls budgets forward to now, so periods reset on
 * time even if nothing ran at midnight.
 *
 * Errors carry a `code`: ERR_ALREADY_BUDGETED, ERR_BUDGET_NOT_FOUND,
 * ERR_INVALID_SETTINGS, ERR_BORROWED_CHOICE_REQUIRED, ERR_INVALID_THEME_MODE,
 * ERR_INVALID_SCREEN_CHOICE.
 */

/** Every budget with its current period. */
export function getBudgets() {
  return RoolioCoreModule.getBudgetsAsync();
}

/** The budget that limits `packageName`, or null if it has none. */
export function getAppBudget(packageName: string) {
  return RoolioCoreModule.getAppBudgetAsync(packageName);
}

/** A budget's closed periods, newest first. */
export function getHistory(budgetId: number) {
  return RoolioCoreModule.getHistoryAsync(budgetId);
}

/**
 * Usage of every budgeted app per day from `fromDay` up to `toDay`
 * (exclusive, "YYYY-MM-DD"), and the periods that start in that range.
 */
export function getStats(fromDay: string, toDay: string) {
  return RoolioCoreModule.getStatsAsync(fromDay, toDay);
}

/** Adds a budget for one app and returns its id. Time already spent this period counts. */
export function createAppBudget(app: BudgetApp, settings: BudgetSettings) {
  return RoolioCoreModule.createAppBudgetAsync(app, settings);
}

/**
 * Saves edits to a budget; they apply immediately. Changing the period of a
 * budget with borrowed time needs `borrowedChoice`, or it rejects with
 * ERR_BORROWED_CHOICE_REQUIRED.
 */
export function updateBudget(
  budgetId: number,
  settings: BudgetSettings,
  borrowedChoice: BorrowedChoice | null = null,
) {
  return RoolioCoreModule.updateBudgetAsync(budgetId, settings, borrowedChoice);
}

/** Removes these apps' budgets and their history. */
export function deleteAppBudgets(packageNames: string[]) {
  return RoolioCoreModule.deleteAppBudgetsAsync(packageNames);
}

/** The first day of the week, as SUNDAY, MONDAY, etc. */
export function getFirstDayOfWeek() {
  return RoolioCoreModule.getFirstDayOfWeekAsync();
}

/** Sets the first day of the week; the current week keeps its end. */
export function setFirstDayOfWeek(day: number) {
  return RoolioCoreModule.setFirstDayOfWeekAsync(day);
}

/** Starts or stops the tracking service to match the budgets and Usage Access. */
export function syncTracking() {
  return RoolioCoreModule.syncTrackingAsync();
}

/** Whether the tracking service is running right now. */
export function isTrackingActive(): boolean {
  return RoolioCoreModule.isTrackingActive();
}

/** The saved theme choice ("system" until the user picks one). */
export function getThemeMode(): ThemeMode {
  return RoolioCoreModule.getThemeMode();
}

/**
 * Saves the theme choice and applies it to everything Roolio shows: its
 * screens, dialogs and the pause screen. It's kept across restarts.
 */
export function setThemeMode(mode: ThemeMode) {
  RoolioCoreModule.setThemeMode(mode);
}

/** Whether the phone itself is in dark mode, whatever Roolio's theme. */
export function isSystemDark(): boolean {
  return RoolioCoreModule.isSystemDark();
}

/**
 * Where the user left Roolio's screens: the last of Home and Stats, and
 * Stats' range and chart. Kept across restarts.
 */
export function getScreenMemory(): ScreenMemory {
  return RoolioCoreModule.getScreenMemory();
}

export function rememberTab(tab: RememberedTab) {
  RoolioCoreModule.rememberTab(tab);
}

export function rememberStatsRange(kind: BudgetPeriod) {
  RoolioCoreModule.rememberStatsRange(kind);
}

export function rememberStatsChart(view: StatsChartView) {
  RoolioCoreModule.rememberStatsChart(view);
}
