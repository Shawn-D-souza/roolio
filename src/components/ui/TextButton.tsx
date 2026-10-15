import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius } from "../../theme/tokens";

type TextButtonProps = {
  label: string;
  onPress: () => void;
};

// A full-width, low-emphasis button, used under a PrimaryButton.
export function TextButton({ label, onPress }: TextButtonProps) {
  const { colors } = useAppTheme();

  // Android ripples ignore borderRadius on the Pressable itself, so a rounded
  // wrapper clips the ripple to the pill shape.
  return (
    <View style={styles.clip}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        android_ripple={{ color: colors.surfaceContainerHighest }}
        style={styles.button}
      >
        <Text style={[styles.label, { color: colors.primary }]}>{label}</Text>
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
});
