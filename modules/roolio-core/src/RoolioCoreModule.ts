import { NativeModule, requireNativeModule } from "expo";
import type {
  BorrowedChoice,
  BudgetApp,
  BudgetRecord,
  BudgetSettings,
  BudgetPeriod,
  PastPeriod,
  RememberedTab,
  ScreenMemory,
  StatsChartView,
  StatsResult,
  ThemeMode,
} from "./RoolioCore.types";

declare class RoolioCoreModule extends NativeModule<{}> {
  getBudgetsAsync(): Promise<BudgetRecord[]>;
  getAppBudgetAsync(packageName: string): Promise<BudgetRecord | null>;
  getHistoryAsync(budgetId: number): Promise<PastPeriod[]>;
  getStatsAsync(fromDay: string, toDay: string): Promise<StatsResult>;
  createAppBudgetAsync(
    app: BudgetApp,
    settings: BudgetSettings,
  ): Promise<number>;
  updateBudgetAsync(
    budgetId: number,
    settings: BudgetSettings,
    borrowedChoice: BorrowedChoice | null,
  ): Promise<void>;
  deleteAppBudgetsAsync(packageNames: string[]): Promise<void>;
  getFirstDayOfWeekAsync(): Promise<number>;
  setFirstDayOfWeekAsync(day: number): Promise<void>;
  syncTrackingAsync(): Promise<void>;
  isTrackingActive(): boolean;
  getThemeMode(): ThemeMode;
  setThemeMode(mode: ThemeMode): void;
  isSystemDark(): boolean;
  getScreenMemory(): ScreenMemory;
  rememberTab(tab: RememberedTab): void;
  rememberStatsRange(kind: BudgetPeriod): void;
  rememberStatsChart(view: StatsChartView): void;
}

export default requireNativeModule<RoolioCoreModule>("RoolioCore");
