import { StyleSheet, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius } from "../../theme/tokens";
import type { TimeLeftState } from "../../budgets/rules";

type UsageBarProps = {
  usedMinutes: number;
  budgetMinutes: number;
  state: TimeLeftState;
};

// Usage in the current period against the budget. Decorative: the text next
// to it says the same thing for screen readers.
export function UsageBar({ usedMinutes, budgetMinutes, state }: UsageBarProps) {
  const { colors } = useAppTheme();
  const progress =
    budgetMinutes > 0 ? Math.min(usedMinutes / budgetMinutes, 1) : 1;
  const fill =
    state === "out"
      ? colors.borrowed
      : state === "low"
        ? colors.low
        : colors.primary;

  return (
    <View
      style={[
        styles.track,
        { backgroundColor: colors.surfaceContainerHighest },
      ]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <View
        style={[
          styles.fill,
          { width: `${progress * 100}%`, backgroundColor: fill },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.full,
  },
});
