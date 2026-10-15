import { useEffect } from "react";
import { syncTracking } from "../../modules/roolio-core";
import { usePermissions } from "../permissions/PermissionsProvider";

/**
 * Starts or stops the native tracking service when Usage Access is turned on
 * or off, and on launch. Budget writes sync the tracker natively.
 */
export function useUsageSync() {
  const { status } = usePermissions();

  const { usageAccess } = status;
  useEffect(() => {
    // The next launch or permission change tries again.
    syncTracking().catch(() => undefined);
  }, [usageAccess]);
}
