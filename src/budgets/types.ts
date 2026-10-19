import type {
  BudgetApp,
  BudgetPeriod,
  BudgetSettings,
} from "../../modules/roolio-core";

export type {
  BorrowedChoice,
  BudgetPeriod,
  BudgetSettings,
} from "../../modules/roolio-core";

export const BUDGET_PERIODS: readonly BudgetPeriod[] = ["day", "week", "month"];

export type BudgetedApp = BudgetApp;

// An upcoming period whose budget can be borrowed from, in whole minutes.
export type UpcomingBudget = {
  // Local date the period starts, "YYYY-MM-DD".
  startDay: string;
  budgetMinutes: number;
  // How much of it is already borrowed.
  takenMinutes: number;
};

// One app's budget with its current period, in whole minutes.
export type BudgetWithUsage = BudgetedApp &
  BudgetSettings & {
    id: number;
    createdAt: number;
    updatedAt: number;
    usedMinutes: number;
    // Time left before borrowing.
    availableMinutes: number;
    // This period's budget splits into time that went to paying back earlier
    // borrowing and its own budget. Banked time comes on top. Time is spent
    // from the own budget first, then banked time.
    repaidMinutes: number;
    ownBudgetMinutes: number;
    bankedInMinutes: number;
    // Banked time not spent yet, e.g. "Banked: 40 min".
    bankedMinutes: number;
    // Time used past this period's own budget and banked time.
    borrowedMinutes: number;
    // Borrowed in earlier periods and not paid back yet.
    owedMinutes: number;
    // Time that can still be borrowed under the cap.
    borrowLeftMinutes: number;
    // The periods borrowed time comes out of, nearest first.
    upcoming: UpcomingBudget[];
  };
