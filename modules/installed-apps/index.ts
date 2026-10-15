import InstalledAppsModule from "./src/InstalledAppsModule";
import { InstalledApp } from "./src/InstalledApps.types";

export type { InstalledApp };

export async function getInstalledAppsAsync(): Promise<InstalledApp[]> {
  if (!InstalledAppsModule) return [];
  return await InstalledAppsModule.getInstalledAppsAsync();
}

/** The packages in `packageNames` that are no longer installed. */
export async function getUninstalledAsync(
  packageNames: string[],
): Promise<string[]> {
  if (!InstalledAppsModule || packageNames.length === 0) return [];
  return await InstalledAppsModule.getUninstalledAsync(packageNames);
}

export async function getAppIconAsync(packageName: string): Promise<string> {
  if (!InstalledAppsModule) return "";
  return await InstalledAppsModule.getAppIconAsync(packageName);
}
