import { StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius } from "../../theme/tokens";

const SIZE = 18;

type LockBadgeProps = {
  // The color of what it sits on, drawn as a ring so the badge stands apart.
  ringColor: string;
};

// A small lock on the corner of a button whose feature needs Premium. Place
// it inside a container with position "relative" (the default).
export function LockBadge({ ringColor }: LockBadgeProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.onSurface, borderColor: ringColor },
      ]}
    >
      <MaterialIcons name="lock" size={11} color={colors.background} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: SIZE,
    height: SIZE,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
