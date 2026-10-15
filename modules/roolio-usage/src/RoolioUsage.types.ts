export type TrackedPeriod = "day" | "week" | "month";

export type TrackedApp = {
  packageName: string;
  /** Usage is summed from the start of this period, in device local time. */
  period: TrackedPeriod;
};

/** Foreground time in the current period, in ms, keyed by package name. */
export type PeriodUsage = Record<string, number>;
