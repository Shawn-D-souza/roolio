import { NativeModule, requireNativeModule } from "expo";
import { PeriodUsage, TrackedApp } from "./RoolioUsage.types";

declare class RoolioUsageModule extends NativeModule<{}> {
  syncTrackedAppsAsync(
    apps: TrackedApp[],
    firstDayOfWeek: number,
  ): Promise<void>;
  getPeriodUsageAsync(): Promise<PeriodUsage>;
  isTrackingActive(): boolean;
}

export default requireNativeModule<RoolioUsageModule>("RoolioUsage");
