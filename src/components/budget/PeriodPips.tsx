import { StyleSheet, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";

// Height of usage bars and the pips beside them.
export const BAR_HEIGHT = 12;

export type Pip = {
  key: string;
  // 0 to 1, filled from the left.
  filled: number;
};

// One segment per whole period, filled in `color` by how much it holds. The
// segments share one fixed width, so a usage bar beside them stays the same
// size however many periods there are. Decorative: the text near it says the
// same.
export function PeriodPips({ pips, color }: { pips: Pip[]; color: string }) {
  const { colors } = useAppTheme();
  if (pips.length === 0) return null;

  return (
    <View
      style={styles.pips}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {pips.map((pip) => {
        const filled = Math.min(Math.max(pip.filled, 0), 1);
        return (
          <View
            key={pip.key}
            style={[styles.pip, { backgroundColor: colors.outlineVariant }]}
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
    width: 40,
    gap: 2,
  },
  pip: {
    flex: 1,
    height: BAR_HEIGHT,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
});
