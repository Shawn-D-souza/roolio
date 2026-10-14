export type BudgetPeriod = "day" | "week" | "month";

export const BUDGET_PERIODS: readonly BudgetPeriod[] = ["day", "week", "month"];

// The user-editable values of a budget.
export type BudgetSettings = {
  period: BudgetPeriod;
  budgetMinutes: number;
  // Maximum banked time, in periods of this budget (0 = no rollover).
  rolloverCeiling: number;
  // Maximum future periods borrowed at once (0 = no borrowing).
  borrowCap: number;
};

export type BudgetedApp = {
  packageName: string;
  appName: string;
  // The app's last update time, used to key its cached icon.
  iconVersion: number;
};

export type AppBudget = BudgetedApp &
  BudgetSettings & {
    createdAt: number;
    updatedAt: number;
  };
