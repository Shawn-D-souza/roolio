import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState } from "react-native";
import {
  getPermissionStatus,
  hasCompletedSetup,
  markSetupCompleted,
  PermissionStatus,
} from "../../modules/roolio-permissions";

// Android 8 can report the overlay permission late after returning from
// Settings, so check once more shortly after the app comes back.
const RECHECK_DELAY_MS = 600;

type PermissionsContextType = {
  status: PermissionStatus;
  // True when a required permission is missing, or notifications are missing
  // and the user hasn't chosen "Not now" since the app was opened.
  needsSetup: boolean;
  // False until the required permissions have been granted once. After that,
  // a missing permission means it was turned off, not never set up.
  setupCompleted: boolean;
  notificationsDeferred: boolean;
  deferNotifications: () => void;
  refresh: () => void;
};

const PermissionsContext = createContext<PermissionsContextType | undefined>(
  undefined,
);

function isSameStatus(a: PermissionStatus, b: PermissionStatus) {
  return (
    a.usageAccess === b.usageAccess &&
    a.overlay === b.overlay &&
    a.notifications === b.notifications
  );
}

function hasRequiredPermissions(status: PermissionStatus) {
  return status.usageAccess && status.overlay;
}

export function PermissionsProvider({ children }: { children: ReactNode }) {
  // Read synchronously so the first render already shows the right screen.
  const [status, setStatus] = useState(getPermissionStatus);
  // Lasts for this app session only, so the screen returns on the next open.
  const [notificationsDeferred, setNotificationsDeferred] = useState(false);
  const [setupCompleted, setSetupCompleted] = useState(
    () => hasCompletedSetup() || hasRequiredPermissions(status),
  );

  // Remember it across launches, so a later missing permission reads as
  // "turned off" rather than "never set up".
  useEffect(() => {
    if (setupCompleted && !hasCompletedSetup()) markSetupCompleted();
  }, [setupCompleted]);

  const refresh = useCallback(() => {
    const next = getPermissionStatus();
    setStatus((current) => (isSameStatus(current, next) ? current : next));
    if (hasRequiredPermissions(next)) setSetupCompleted(true);
  }, []);

  // Permissions are granted (or revoked) in Settings, outside the app.
  useEffect(() => {
    let recheck: ReturnType<typeof setTimeout> | undefined;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      refresh();
      clearTimeout(recheck);
      recheck = setTimeout(refresh, RECHECK_DELAY_MS);
    });
    return () => {
      subscription.remove();
      clearTimeout(recheck);
    };
  }, [refresh]);

  const deferNotifications = useCallback(
    () => setNotificationsDeferred(true),
    [],
  );

  const value = useMemo(
    () => ({
      status,
      needsSetup:
        !hasRequiredPermissions(status) ||
        (!status.notifications && !notificationsDeferred),
      setupCompleted,
      notificationsDeferred,
      deferNotifications,
      refresh,
    }),
    [status, setupCompleted, notificationsDeferred, deferNotifications, refresh],
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
}
