import { StyleSheet, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius } from "../../theme/tokens";
import type { TimeLeftState } from "../../budgets/rules";

type UsageBarProps = {
  usedMinutes: number;
  // This period's time, left to right. Repaid time went to paying back
  // earlier borrowing, so it reads as already gone. Usage then fills the own
  // budget, then banked time. Each part is as wide as its minutes.
  repaidMinutes?: number;
  budgetMinutes: number;
  bankedMinutes?: number;
  state: TimeLeftState;
};

type Segment = {
  key: string;
  minutes: number;
  track: string;
  // Spent minutes in this segment.
  spent: number;
};

// Usage in the current period. Decorative: the text next to it says the same
// thing for screen readers.
export function UsageBar({
  usedMinutes,
  repaidMinutes = 0,
  budgetMinutes,
  bankedMinutes = 0,
  state,
}: UsageBarProps) {
  const { colors } = useAppTheme();
  const fill =
    state === "out"
      ? colors.borrowed
      : state === "low"
        ? colors.low
        : colors.primary;

  const spentOwn = Math.min(usedMinutes, budgetMinutes);
  const spentBanked = Math.min(
    Math.max(usedMinutes - budgetMinutes, 0),
    bankedMinutes,
  );
  const segments: Segment[] = [
    {
      key: "repaid",
      minutes: repaidMinutes,
      track: colors.borrowedContainer,
      spent: 0,
    },
    {
      key: "budget",
      minutes: budgetMinutes,
      track: colors.surfaceContainerHighest,
      spent: spentOwn,
    },
    {
      key: "banked",
      minutes: bankedMinutes,
      track: colors.primaryContainer,
      spent: spentBanked,
    },
  ].filter((segment) => segment.minutes > 0);

  return (
    <SegmentedBar
      segments={segments.map((segment) => ({
        key: segment.key,
        weight: segment.minutes,
        track: segment.track,
        fill,
        progress: segment.spent / segment.minutes,
      }))}
      emptyColor={fill}
    />
  );
}

export type BarSegment = {
  key: string;
  // Relative width.
  weight: number;
  track: string;
  fill: string;
  // 0 to 1.
  progress: number;
};

// A row of rounded segments separated by small gaps. With no segments it
// draws one full bar in `emptyColor` (no time at all this period).
export function SegmentedBar({
  segments,
  emptyColor,
}: {
  segments: BarSegment[];
  emptyColor: string;
}) {
  return (
    <View
      style={styles.bar}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {segments.length === 0 ? (
        <View
          style={[styles.track, { flex: 1, backgroundColor: emptyColor }]}
        />
      ) : (
        segments.map((segment) => (
          <View
            key={segment.key}
            style={[
              styles.track,
              { flex: segment.weight, backgroundColor: segment.track },
            ]}
          >
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.min(Math.max(segment.progress, 0), 1) * 100}%`,
                  backgroundColor: segment.fill,
                },
              ]}
            />
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    gap: 3,
  },
  track: {
    height: 8,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
});
