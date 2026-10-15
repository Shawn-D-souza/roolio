import type {
  BorrowOffer,
  BudgetApp,
  BudgetPeriod,
  BudgetSettings,
} from "../../modules/roolio-core";

export type {
  BorrowedChoice,
  BorrowOffer,
  BudgetPeriod,
  BudgetSettings,
} from "../../modules/roolio-core";

export const BUDGET_PERIODS: readonly BudgetPeriod[] = ["day", "week", "month"];

export type BudgetedApp = BudgetApp;

// One app's budget with its current period, in whole minutes.
export type BudgetWithUsage = BudgetedApp &
  BudgetSettings & {
    id: number;
    createdAt: number;
    updatedAt: number;
    usedMinutes: number;
    availableMinutes: number;
    // Banked time not spent yet, e.g. "Banked: 40 min".
    bankedMinutes: number;
    // Upcoming periods already borrowed, e.g. "Borrowed: 2 days ahead".
    borrowedPeriods: number;
    // Minutes still owed after a period change.
    owedMinutes: number;
    // Null when the borrow cap is reached or borrowing is off.
    nextBorrow: BorrowOffer | null;
  };
