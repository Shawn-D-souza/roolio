export type BudgetPeriod = "day" | "week" | "month";

export type BudgetKind = "app" | "group" | "total";

/** What happens to borrowed time still owed when a budget changes period. */
export type BorrowedChoice = "clear" | "keep";

/** Roolio's theme: the phone's setting, or always light or dark. */
export type ThemeMode = "system" | "light" | "dark";

/** The tabs Roolio reopens on. Settings isn't kept. */
export type RememberedTab = "home" | "stats";

/** The charts Stats can show time used with. */
export type StatsChartView = "ring" | "stacked" | "daily";

/** Where the user left Roolio's screens; null where nothing is saved. */
export type ScreenMemory = {
  tab: RememberedTab | null;
  statsRange: BudgetPeriod | null;
  statsChart: StatsChartView | null;
};

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

/** An upcoming period whose budget can be borrowed from. */
export type UpcomingPeriod = {
  /** Local date the period starts, "YYYY-MM-DD". */
  startDay: string;
  budgetMs: number;
  /** How much of its budget is already borrowed. */
  takenMs: number;
};

type PeriodFields = {
  period: BudgetPeriod;
  /** Local dates, "YYYY-MM-DD"; `endDay` is the next period's start. */
  startDay: string;
  endDay: string;
  budgetMinutes: number;
  /** Borrowed time from earlier periods, paid back from this period's budget. */
  repaidMs: number;
  /** Banked time carried in at the start. */
  bankedInMs: number;
};

/**
 * Usage is counted in whole minutes, so every amount here is a whole number
 * of minutes (in ms).
 */
export type CurrentPeriod = PeriodFields & {
  usedMs: number;
  /** The period's budget less what it pays back of earlier borrowing. */
  ownBudgetMs: number;
  /** Time left before borrowing. */
  availableMs: number;
  /** Banked time not spent yet. */
  bankedMs: number;
  /** Time used past this period's own budget and banked time. */
  borrowedMs: number;
  /** Borrowed in earlier periods and not paid back yet. */
  owedMs: number;
  /** Time that can still be borrowed under the cap. */
  borrowLeftMs: number;
  /**
   * The periods borrowed time comes out of, nearest first: one per borrow
   * cap, or more while owed time reaches further.
   */
  upcoming: UpcomingPeriod[];
};

export type PastPeriod = PeriodFields & {
  usedMs: number;
  /** Banked time carried out to the next period. */
  bankedOutMs: number;
  /** Time used past the period's own time, owed by later periods. */
  borrowedMs: number;
  closedAt: number;
};

/** One app's time on one local day, in whole minutes (in ms). */
export type DailyUsage = {
  packageName: string;
  /** "YYYY-MM-DD". */
  day: string;
  usedMs: number;
};

/** A period that starts in a stats range: closed, or the current one so far. */
export type StatsPeriod = PeriodFields & {
  budgetId: number;
  open: boolean;
  usedMs: number;
  /** Banked time carried out; null while open. */
  bankedOutMs: number | null;
  /** Time used past the period's own time, owed by later periods. */
  borrowedMs: number;
};

export type StatsResult = {
  usage: DailyUsage[];
  /** Oldest first. */
  periods: StatsPeriod[];
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
