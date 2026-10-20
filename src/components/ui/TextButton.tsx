import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius } from "../../theme/tokens";

type TextButtonProps = {
  label: string;
  onPress: () => void;
  // "secondary" has a neutral grey fill: the screen's second choice.
  // "subtle" is smaller and grey: the least likely choice on the screen.
  variant?: "text" | "secondary" | "subtle";
};

// A full-width button with less emphasis than a PrimaryButton, used under one.
export function TextButton({
  label,
  onPress,
  variant = "text",
}: TextButtonProps) {
  const { colors } = useAppTheme();
  const secondary = variant === "secondary";
  const labelColor =
    variant === "subtle" ? colors.onSurfaceVariant : colors.primary;

  // Android ripples ignore borderRadius on the Pressable itself, so a rounded
  // wrapper clips the ripple to the pill shape.
  return (
    <View
      style={[
        styles.clip,
        secondary && { backgroundColor: colors.surfaceContainerHighest },
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        android_ripple={{
          // The label color at 12% opacity: Material's pressed state.
          color: secondary
            ? `${colors.primary}1F`
            : colors.surfaceContainerHighest,
        }}
        style={styles.button}
      >
        <Text
          style={[
            styles.label,
            variant === "subtle" && styles.subtleLabel,
            { color: labelColor },
          ]}
        >
          {label}
        </Text>
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
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
  subtleLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
});
