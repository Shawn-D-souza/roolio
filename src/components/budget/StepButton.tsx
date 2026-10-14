import { useEffect, useRef } from "react";
import { Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius } from "../../theme/tokens";

const HOLD_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 90;

type StepButtonProps = {
  direction: "increase" | "decrease";
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
  size?: number;
};

// A round tonal −/+ button used by the budget steppers. Holding it repeats.
export function StepButton({
  direction,
  onPress,
  disabled = false,
  accessibilityLabel,
  size = 40,
}: StepButtonProps) {
  const { colors } = useAppTheme();
  const onPressRef = useRef(onPress);
  const repeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // The interval must always call the latest handler, which closes over the
  // latest value.
  useEffect(() => {
    onPressRef.current = onPress;
  }, [onPress]);

  const stopRepeat = () => {
    if (repeatTimer.current !== null) {
      clearInterval(repeatTimer.current);
      repeatTimer.current = null;
    }
  };

  const startRepeat = () => {
    stopRepeat();
    onPressRef.current();
    repeatTimer.current = setInterval(
      () => onPressRef.current(),
      REPEAT_INTERVAL_MS,
    );
  };

  // Stop at the limit, and never leave a timer running after unmount.
  useEffect(() => {
    if (disabled) stopRepeat();
  }, [disabled]);
  useEffect(() => stopRepeat, []);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={startRepeat}
      onPressOut={stopRepeat}
      delayLongPress={HOLD_DELAY_MS}
      disabled={disabled}
      hitSlop={4}
      android_ripple={{ color: colors.outlineVariant, borderless: true }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[
        styles.button,
        {
          width: size,
          height: size,
          backgroundColor: colors.surfaceContainerHighest,
          opacity: disabled ? 0.38 : 1,
        },
      ]}
    >
      <MaterialIcons
        name={direction === "increase" ? "add" : "remove"}
        size={size * 0.55}
        color={colors.onSurface}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
