import RoolioUsageModule from "./src/RoolioUsageModule";
import {
  PeriodUsage,
  TrackedApp,
  TrackedPeriod,
} from "./src/RoolioUsage.types";

export type { PeriodUsage, TrackedApp, TrackedPeriod };

/** java.util.Calendar day numbers, used for `firstDayOfWeek`. */
export const SUNDAY = 1;
export const MONDAY = 2;

/**
 * Sets the apps to track. Tracking runs in a native foreground service, which
 * starts when there are apps and Usage Access is on, and stops otherwise. Time
 * already spent in an app's current period is counted when it's added.
 */
export function syncTrackedApps(
  apps: TrackedApp[],
  firstDayOfWeek: number = MONDAY,
) {
  return RoolioUsageModule.syncTrackedAppsAsync(apps, firstDayOfWeek);
}

/** Up-to-date foreground time of each tracked app in its current period. */
export function getPeriodUsage(): Promise<PeriodUsage> {
  return RoolioUsageModule.getPeriodUsageAsync();
}

/** Whether the tracking service is running right now. */
export function isTrackingActive(): boolean {
  return RoolioUsageModule.isTrackingActive();
}
