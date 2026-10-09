import InstalledAppsModule from './src/InstalledAppsModule';
import { InstalledApp } from './src/InstalledApps.types';

export type { InstalledApp };

export async function getInstalledAppsAsync(): Promise<InstalledApp[]> {
  if (!InstalledAppsModule) return [];
  return await InstalledAppsModule.getInstalledAppsAsync();
}

export async function getAppIconAsync(packageName: string): Promise<string> {
  if (!InstalledAppsModule) return "";
  return await InstalledAppsModule.getAppIconAsync(packageName);
}
