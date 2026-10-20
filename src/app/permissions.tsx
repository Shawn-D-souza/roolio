import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, AppState, Easing, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../theme/ThemeProvider";
import { useReduceMotion } from "../hooks/useReduceMotion";
import { usePermissions } from "../permissions/PermissionsProvider";
import { getStepContent, PERMISSION_STEPS } from "../permissions/steps";
import { StepDots } from "../components/permissions/StepDots";
import { GuidedPermissionStep } from "../components/permissions/GuidedPermissionStep";
import { ClassicPermissionStep } from "../components/permissions/ClassicPermissionStep";
import {
  getNotificationPermissionAsync,
  getPermissionStatus,
  openPermissionSettings,
  PermissionName,
  requestNotificationPermissionAsync,
} from "../../modules/roolio-permissions";

const ENTER_MS = 260;
const ENTER_OFFSET = 16;

const OPEN_SETTINGS_FAILED =
  "Couldn't open Settings. Open your phone's Settings app, go to Apps, then Roolio, and turn it on there.";

export default function PermissionsScreen() {
  const { colors } = useAppTheme();
  const reduceMotion = useReduceMotion();
  const {
    status,
    setupCompleted,
    notificationsDeferred,
    deferNotifications,
    declineNotifications,
    refresh,
  } = usePermissions();

  // Fixed when the screen opens, so the wording doesn't change mid-flow once
  // the last required permission is granted.
  const [returning] = useState(setupCompleted);

  const currentStep = PERMISSION_STEPS.find(
    (id) => !status[id] && !(id === "notifications" && notificationsDeferred),
  );

  // Whether Android will still show the notification dialog. Assume yes until known.
  const [canAskNotifications, setCanAskNotifications] = useState(true);
  const [busy, setBusy] = useState(false);
  // Shown when the user comes back from Settings without granting the step.
  const [hint, setHint] = useState<{
    step: PermissionName;
    message: string;
  } | null>(null);
  const awaitingReturnFrom = useRef<PermissionName | null>(null);

  const content = currentStep
    ? getStepContent(currentStep, { returning, canAskNotifications })
    : undefined;

  const checkNotifications = useCallback(() => {
    getNotificationPermissionAsync()
      .then((result) => setCanAskNotifications(result.canAskAgain))
      .catch(() => setCanAskNotifications(false));
  }, []);

  useEffect(() => {
    if (currentStep === "notifications") checkNotifications();
  }, [currentStep, checkNotifications]);

  // Coming back from Settings: if it's still off, say so instead of silently
  // showing the same screen again. The provider re-reads the status on the
  // same event; a granted step moves on, so this hint is only ever seen on a
  // step that's still off.
  const stillOffHint = content?.stillOffHint;
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      const step = awaitingReturnFrom.current;
      awaitingReturnFrom.current = null;
      if (step === "notifications") checkNotifications();
      // Roolio may have brought itself back because it was granted.
      if (step && stillOffHint && !getPermissionStatus()[step]) {
        setHint({ step, message: stillOffHint });
      }
    });
    return () => subscription.remove();
  }, [stillOffHint, checkNotifications]);

  // Each step slides in gently, so a granted permission visibly moves on.
  const [enter] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduceMotion) {
      enter.setValue(1);
      return;
    }
    enter.setValue(0);
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: ENTER_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [currentStep, reduceMotion, enter]);

  // Every permission is in place; the layout is about to leave this screen.
  if (!currentStep || !content) {
    return (
      <View
        style={[styles.container, { backgroundColor: colors.background }]}
      />
    );
  }

  const openSettings = () => {
    try {
      awaitingReturnFrom.current = currentStep;
      openPermissionSettings(currentStep, content.settingsHint);
    } catch {
      awaitingReturnFrom.current = null;
      setHint({ step: currentStep, message: OPEN_SETTINGS_FAILED });
    }
  };

  const requestNotifications = async () => {
    setBusy(true);
    try {
      const result = await requestNotificationPermissionAsync();
      if (!result.granted) {
        setCanAskNotifications(result.canAskAgain);
        setHint({
          step: "notifications",
          message: getStepContent("notifications", {
            returning,
            canAskNotifications: result.canAskAgain,
          }).stillOffHint,
        });
      }
    } catch {
      setCanAskNotifications(false);
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const visibleHint = hint?.step === currentStep ? hint.message : null;

  // A first-time setup shows its progress; a returning user only has the
  // missing permission to fix, so a step count would mislead.
  const progress = returning ? undefined : (
    <StepDots
      count={PERMISSION_STEPS.length}
      current={PERMISSION_STEPS.indexOf(currentStep)}
      done={PERMISSION_STEPS.map((id) => status[id])}
    />
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Animated.View
        style={[
          styles.container,
          {
            opacity: enter,
            transform: [
              {
                translateY: enter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [ENTER_OFFSET, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Keyed by step, so each step starts fresh (intro first, sheets closed). */}
        {content.layout === "guided" ? (
          <GuidedPermissionStep
            key={currentStep}
            content={content}
            progress={progress}
            hint={visibleHint}
            onOpenSettings={openSettings}
          />
        ) : (
          <ClassicPermissionStep
            key={currentStep}
            content={content}
            progress={progress}
            hint={visibleHint}
            busy={busy}
            onAction={
              content.opensSettings ? openSettings : requestNotifications
            }
            onNotNow={deferNotifications}
            onDontAskAgain={declineNotifications}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
