import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { useReduceMotion } from "../../hooks/useReduceMotion";

// Material 3 motion: enter slightly slower than exit, decelerating in.
const ENTER_MS = 220;
const EXIT_MS = 150;
const START_SCALE = 0.92;

export type DialogAction = {
  label: string;
  onPress?: () => void;
  // "destructive" is shown in the error color for actions that lose data.
  tone?: "default" | "destructive";
};

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  // Shown right-aligned in order; put the confirming action last.
  actions: DialogAction[];
  // Called on back press, scrim tap, and after any action.
  onDismiss: () => void;
};

// A Material 3 dialog that follows the app theme, unlike the native Alert.
export function ConfirmDialog({
  visible,
  title,
  message,
  actions,
  onDismiss,
}: ConfirmDialogProps) {
  const { colors } = useAppTheme();
  const reduceMotion = useReduceMotion();
  // 0 = hidden, 1 = shown. Drives the scrim fade and the dialog fade + scale.
  const [progress] = useState(() => new Animated.Value(0));
  // The Modal stays mounted until the exit animation has finished.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted) return;
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 0 : visible ? ENTER_MS : EXIT_MS,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      // Runs on the UI thread, so it stays smooth even if JS is busy.
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => animation.stop();
  }, [visible, mounted, reduceMotion, progress]);

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [START_SCALE, 1],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Ignore touches while closing so an action can't fire twice. */}
      <View
        style={[styles.root, { pointerEvents: visible ? "auto" : "none" }]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.scrim, opacity: progress },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close dialog"
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.dialog,
            {
              backgroundColor: colors.surfaceContainerHigh,
              opacity: progress,
              transform: [{ scale }],
            },
          ]}
        >
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.onSurface }]}
          >
            {title}
          </Text>
          <Text style={[styles.message, { color: colors.onSurfaceVariant }]}>
            {message}
          </Text>
          <View style={styles.actions}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => {
                  onDismiss();
                  action.onPress?.();
                }}
                android_ripple={{ color: colors.surfaceContainerHighest }}
                accessibilityRole="button"
                style={styles.action}
              >
                <Text
                  style={[
                    styles.actionLabel,
                    {
                      color:
                        action.tone === "destructive"
                          ? colors.error
                          : colors.primary,
                    },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xl,
  },
  dialog: {
    width: "100%",
    maxWidth: 400,
    borderRadius: radius.extraLarge,
    paddingTop: space.xl,
    paddingHorizontal: space.xl,
    paddingBottom: space.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: space.lg,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: space.sm,
    marginTop: space.xl,
  },
  action: {
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
});
