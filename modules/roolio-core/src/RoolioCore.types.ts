export type BudgetPeriod = "day" | "week" | "month";

export type BudgetKind = "app" | "group" | "total";

/** What happens to borrowed periods when a budget changes period. */
export type BorrowedChoice = "clear" | "keep";

/** The values of a budget the user chooses. */
export type BudgetSettings = {
  period: BudgetPeriod;
  budgetMinutes: number;
  /** Most banked time, in periods of this budget (0 = no rollover). */
  rolloverCeiling: number;
  /** Most future periods borrowed at once (0 = no borrowing). */
  borrowCap: number;
};

export type BudgetApp = {
  packageName: string;
  appName: string;
  /** The app's last update time, used to key its cached icon. */
  iconVersion: number;
};

/** What the next borrow would take, e.g. "Borrow Tuesday's 60 min". */
export type BorrowOffer = {
  /** Local date the borrowed period starts, "YYYY-MM-DD". */
  targetDay: string;
  amountMs: number;
  /** Borrowing slots left under the cap, counting this one. */
  slotsLeft: number;
};

type PeriodFields = {
  period: BudgetPeriod;
  /** Local dates, "YYYY-MM-DD"; `endDay` is the next period's start. */
  startDay: string;
  endDay: string;
  budgetMinutes: number;
  /** The period was borrowed earlier, so its own budget is 0. */
  borrowed: boolean;
  /** Minutes owed after a period change, taken from this period's budget. */
  repaidMs: number;
  /** Banked time carried in at the start. */
  bankedInMs: number;
};

export type CurrentPeriod = PeriodFields & {
  usedMs: number;
  availableMs: number;
  /** Banked time not spent yet. */
  bankedMs: number;
  /** Time gained by borrowing in this period, and how much is left. */
  gainedMs: number;
  gainedLeftMs: number;
  /** Upcoming periods already borrowed. */
  borrowedPeriods: number;
  /** Minutes still owed after a period change. */
  owedMs: number;
  /** Null when the borrow cap is reached or borrowing is off. */
  nextBorrow: BorrowOffer | null;
};

export type PastPeriod = PeriodFields & {
  usedMs: number;
  /** Banked time carried out to the next period. */
  bankedOutMs: number;
  gainedMs: number;
  closedAt: number;
};

export type BudgetRecord = BudgetSettings & {
  id: number;
  kind: BudgetKind;
  /** The group's name; null for app and total budgets. */
  name: string | null;
  createdAt: number;
  updatedAt: number;
  apps: BudgetApp[];
  current: CurrentPeriod;
};
