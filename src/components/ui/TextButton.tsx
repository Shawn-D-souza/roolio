import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";

type TextButtonProps = {
  label: string;
  onPress: () => void;
  // "secondary" has a neutral grey fill: the screen's second choice.
  // "subtle" is smaller and grey: the least likely choice on the screen.
  // "destructive" is outlined in the error color: an action that loses data.
  variant?: "text" | "secondary" | "subtle" | "destructive";
  // Leading icon, e.g. "delete-outline" for a destructive action.
  icon?: keyof typeof MaterialIcons.glyphMap;
};

// A full-width button with less emphasis than a PrimaryButton, used under one.
export function TextButton({
  label,
  onPress,
  variant = "text",
  icon,
}: TextButtonProps) {
  const { colors } = useAppTheme();
  const secondary = variant === "secondary";
  const destructive = variant === "destructive";
  const labelColor =
    variant === "subtle"
      ? colors.onSurfaceVariant
      : destructive
        ? colors.error
        : colors.primary;

  // Android ripples ignore borderRadius on the Pressable itself, so a rounded
  // wrapper clips the ripple to the pill shape.
  return (
    <View
      style={[
        styles.clip,
        secondary && { backgroundColor: colors.surfaceContainerHighest },
        destructive && [styles.outlined, { borderColor: colors.error }],
      ]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        android_ripple={{
          // The label color at 12% opacity: Material's pressed state.
          color:
            secondary || destructive
              ? `${labelColor}1F`
              : colors.surfaceContainerHighest,
        }}
        style={styles.button}
      >
        {icon && <MaterialIcons name={icon} size={20} color={labelColor} />}
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
  outlined: {
    borderWidth: 1,
  },
  button: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
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
