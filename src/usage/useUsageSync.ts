import { useCallback, useEffect } from "react";
import { useSQLiteContext } from "expo-sqlite";
import { listBudgets } from "../budgets/repository";
import { subscribeToBudgetChanges } from "../budgets/events";
import { usePermissions } from "../permissions/PermissionsProvider";
import { syncTracking } from "./tracking";

/**
 * Keeps the native tracker's app list in step with the budgets: on launch,
 * after every budget write, and when Usage Access is turned on or off.
 * Syncing an unchanged list costs almost nothing natively.
 */
export function useUsageSync() {
  const db = useSQLiteContext();
  const { status } = usePermissions();

  const sync = useCallback(() => {
    listBudgets(db)
      .then(syncTracking)
      // The next launch or budget change tries again.
      .catch(() => undefined);
  }, [db]);

  const { usageAccess } = status;
  useEffect(() => {
    // Usage Access gates the service, so re-sync whenever it changes.
    sync();
  }, [sync, usageAccess]);

  useEffect(() => subscribeToBudgetChanges(sync), [sync]);
}
