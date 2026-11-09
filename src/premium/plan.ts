import { router } from "expo-router";
import { FREE_APP_LIMIT } from "../../modules/roolio-core";
import type { BudgetPeriod } from "../budgets/types";

// What the free plan allows. `plan/Premium.kt` checks the same rules, so keep
// them in step.
export { FREE_APP_LIMIT };

/** The Premium features, in the order the Premium screen lists them. */
export type PremiumFeature = "apps" | "periods" | "stats";

/** Whether a budget can be set to `period` without Premium. */
export function isFreePeriod(period: BudgetPeriod) {
  return period === "day";
}

/** Opens the Premium screen, pointing out `feature` when a lock was tapped. */
export function openPremium(feature?: PremiumFeature) {
  router.push({ pathname: "/premium", params: feature ? { feature } : {} });
}

/** Whether `error` is the native rejection of a change that needs Premium. */
export function isPremiumRequired(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ERR_PREMIUM_REQUIRED"
  );
}
