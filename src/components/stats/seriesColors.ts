import type { AppColors } from "../../theme/tokens";
import { OTHER_APPS, type AppStats } from "../../stats/summary";

// The app charts' colors: one series color per most used app, in order, and
// grey for the apps that share a slice. Every chart names its apps too, so a
// color is never the only way to tell them apart.
export function seriesColors(colors: AppColors, series: readonly string[]) {
  const byKey = new Map<string, string>();
  series.forEach((packageName, index) => {
    byKey.set(packageName, colors.series[index] ?? colors.outline);
  });
  return (key: string) => byKey.get(key) ?? colors.outline;
}

// An app's name for the charts' labels; the shared slice is "Other apps".
export function seriesNames(apps: readonly AppStats[]) {
  const names = new Map(apps.map((app) => [app.packageName, app.appName]));
  return (key: string) =>
    key === OTHER_APPS ? "Other apps" : (names.get(key) ?? key);
}
