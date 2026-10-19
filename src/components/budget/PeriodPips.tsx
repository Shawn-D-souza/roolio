import { StyleSheet, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius } from "../../theme/tokens";

// Height of usage bars and the pips beside them.
export const BAR_HEIGHT = 12;

export type Pip = {
  key: string;
  // 0 to 1, filled from the left.
  filled: number;
};

// Pips shrink as there are more of them, counting both sides of a usage bar,
// so a high rollover ceiling and borrow cap still leave room for the bar.
export function pipWidth(count: number) {
  if (count <= 4) return 22;
  if (count <= 8) return 14;
  return 8;
}

// One outlined capsule per whole period, filled in `color` by how much it
// holds. Outlined, rather than tinted, so they read as other periods, apart
// from the current period's bar. Decorative: the text near it says the same.
export function PeriodPips({
  pips,
  color,
  width,
}: {
  pips: Pip[];
  color: string;
  width: number;
}) {
  const { colors } = useAppTheme();
  if (pips.length === 0) return null;

  return (
    <View
      style={[styles.pips, { gap: width > 8 ? 4 : 3 }]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {pips.map((pip) => {
        const filled = Math.min(Math.max(pip.filled, 0), 1);
        return (
          <View
            key={pip.key}
            style={[
              styles.pip,
              { width, borderColor: filled > 0 ? color : colors.outline },
            ]}
          >
            <View
              style={[
                styles.fill,
                { width: `${filled * 100}%`, backgroundColor: color },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  pips: {
    flexDirection: "row",
  },
  pip: {
    height: BAR_HEIGHT,
    borderRadius: radius.full,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
});
