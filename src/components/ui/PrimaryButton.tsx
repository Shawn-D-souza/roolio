import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  // Greyed out and not pressable.
  disabled?: boolean;
  // Shows a spinner in place of the label and ignores presses.
  busy?: boolean;
  // Trailing icon, e.g. "open-in-new" when the button leaves the app.
  icon?: keyof typeof MaterialIcons.glyphMap;
  accessibilityHint?: string;
};

// The full-width filled button used for a screen's main action.
export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  busy = false,
  icon,
  accessibilityHint,
}: PrimaryButtonProps) {
  const { colors } = useAppTheme();
  // While busy the button keeps its color, so the spinner reads as progress.
  const inactive = disabled && !busy;
  const labelColor = inactive ? colors.onSurfaceVariant : colors.onPrimary;

  // Android ripples ignore borderRadius on the Pressable itself, so a rounded
  // wrapper clips the ripple to the pill shape.
  return (
    <View
      style={[
        styles.clip,
        {
          backgroundColor: inactive
            ? colors.surfaceContainerHighest
            : colors.primary,
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        disabled={disabled || busy}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled, busy }}
        android_ripple={{ color: colors.primaryContainer }}
        style={styles.button}
      >
        {busy ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <>
            <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
            {icon && <MaterialIcons name={icon} size={18} color={labelColor} />}
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    borderRadius: radius.full,
    overflow: "hidden",
  },
  button: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
});
