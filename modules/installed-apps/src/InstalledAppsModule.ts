import { NativeModule, requireNativeModule } from 'expo';
import { InstalledApp } from './InstalledApps.types'

declare class InstalledAppsModule extends NativeModule<{}> {
  getInstalledAppsAsync(): Promise<InstalledApp[]>;
  getAppIconAsync(packageName: string): Promise<string>;
}

export default requireNativeModule<InstalledAppsModule>('InstalledApps');
