import { NativeModule, requireNativeModule } from "expo";
import type {
  BorrowedChoice,
  BorrowOffer,
  BudgetApp,
  BudgetRecord,
  BudgetSettings,
  PastPeriod,
} from "./RoolioCore.types";

declare class RoolioCoreModule extends NativeModule<{}> {
  getBudgetsAsync(): Promise<BudgetRecord[]>;
  getAppBudgetAsync(packageName: string): Promise<BudgetRecord | null>;
  getHistoryAsync(budgetId: number): Promise<PastPeriod[]>;
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
  borrowAsync(budgetId: number): Promise<BorrowOffer>;
  setFirstDayOfWeekAsync(day: number): Promise<void>;
  syncTrackingAsync(): Promise<void>;
  isTrackingActive(): boolean;
}

export default requireNativeModule<RoolioCoreModule>("RoolioCore");
