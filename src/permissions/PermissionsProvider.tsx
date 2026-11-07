import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import {
  getPermissionStatus,
  hasCompletedSetup,
  hasDeclinedBattery,
  hasDeclinedNotifications,
  hasSeenWelcome,
  markBatteryDeclined,
  markNotificationsDeclined,
  markSetupCompleted,
  markWelcomeSeen,
  PermissionName,
  PermissionStatus,
  requestNotificationPermissionAsync,
} from "../../modules/roolio-permissions";

// Android 8 can report the overlay permission late after returning from
// Settings, so check once more shortly after the app comes back.
const RECHECK_DELAY_MS = 600;

// The steps a user can skip.
export type OptionalPermission = "batteryUnrestricted" | "notifications";

type PermissionsContextType = {
  // True until a new user taps "Get started" on the welcome screen, which
  // comes before setup. Never true for anyone who has set Roolio up before.
  showWelcome: boolean;
  finishWelcome: () => void;
  status: PermissionStatus;
  // True when a required permission is missing, or an optional one is missing
  // and its step isn't deferred.
  needsSetup: boolean;
  // False until the required permissions have been granted once. After that,
  // a missing permission means it was turned off, not never set up.
  setupCompleted: boolean;
  deferredSteps: Partial<Record<PermissionName, boolean>>;
  // "Not now": skips the step until the app is opened again.
  deferStep: (step: OptionalPermission) => void;
  // "Don't ask again": skips it for good.
  declineStep: (step: OptionalPermission) => void;
  refresh: () => void;
};

const PermissionsContext = createContext<PermissionsContextType | undefined>(
  undefined,
);

function isSameStatus(a: PermissionStatus, b: PermissionStatus) {
  return (
    a.usageAccess === b.usageAccess &&
    a.overlay === b.overlay &&
    a.notifications === b.notifications &&
    a.batteryUnrestricted === b.batteryUnrestricted
  );
}

function hasRequiredPermissions(status: PermissionStatus) {
  return status.usageAccess && status.overlay;
}

export function PermissionsProvider({ children }: { children: ReactNode }) {
  // Read synchronously so the first render already shows the right screen.
  const [status, setStatus] = useState(getPermissionStatus);
  const [setupCompleted, setSetupCompleted] = useState(
    () => hasCompletedSetup() || hasRequiredPermissions(status),
  );
  const [showWelcome, setShowWelcome] = useState(
    () => !setupCompleted && !hasSeenWelcome(),
  );
  // "Not now" lasts for this app session only, so the screen returns on the
  // next open; "Don't ask again" is remembered. First-time setup has no
  // notifications step: Android's own dialog asks once setup is done.
  const [deferredSteps, setDeferredSteps] = useState<
    Record<OptionalPermission, boolean>
  >(() => ({
    batteryUnrestricted: hasDeclinedBattery(),
    notifications: !setupCompleted || hasDeclinedNotifications(),
  }));
  const shouldAskNotifications = useRef(!setupCompleted);

  const needsSetup =
    !hasRequiredPermissions(status) ||
    (!status.batteryUnrestricted && !deferredSteps.batteryUnrestricted) ||
    (!status.notifications && !deferredSteps.notifications);

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

  // A new user has been through enough screens by now, so the dialog comes up
  // over Home. If it's refused, the notifications step shows on the next open.
  useEffect(() => {
    if (!shouldAskNotifications.current || needsSetup) return;
    shouldAskNotifications.current = false;
    if (status.notifications) return;
    requestNotificationPermissionAsync()
      .catch(() => undefined)
      .finally(refresh);
  }, [needsSetup, status.notifications, refresh]);

  const finishWelcome = useCallback(() => {
    markWelcomeSeen();
    setShowWelcome(false);
  }, []);

  const deferStep = useCallback(
    (step: OptionalPermission) =>
      setDeferredSteps((current) => ({ ...current, [step]: true })),
    [],
  );

  const declineStep = useCallback(
    (step: OptionalPermission) => {
      if (step === "batteryUnrestricted") markBatteryDeclined();
      else markNotificationsDeclined();
      deferStep(step);
    },
    [deferStep],
  );

  const value = useMemo(
    () => ({
      showWelcome,
      finishWelcome,
      status,
      needsSetup,
      setupCompleted,
      deferredSteps,
      deferStep,
      declineStep,
      refresh,
    }),
    [
      showWelcome,
      finishWelcome,
      status,
      needsSetup,
      setupCompleted,
      deferredSteps,
      deferStep,
      declineStep,
      refresh,
    ],
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
