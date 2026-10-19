import { StyleSheet, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import type { BudgetWithUsage } from "../../budgets/types";
import { BAR_HEIGHT, PeriodPips, pipWidth as widthFor } from "./PeriodPips";

// How many pips banked time gets: the rollover ceiling, or more if a lowered
// budget left more banked than that many periods now hold.
export function bankSlots(budget: BudgetWithUsage) {
  if (budget.budgetMinutes <= 0) return 0;
  return Math.max(
    budget.rolloverCeiling,
    Math.ceil(budget.bankedInMinutes / budget.budgetMinutes),
  );
}

// Time left in the current period, read like a battery. Left to right:
// banked time as one green pip per period it could fill, then this period's
// own budget as a bar (indigo), then paid back (rust, already gone). What's
// left is solid and drains from the right as it's used: the budget first,
// then banked time. Low and out of time are told by the text next to it, not
// the bar. Decorative: that text says the same thing for screen readers.
export function UsageBar({
  budget,
  pipWidth,
}: {
  budget: BudgetWithUsage;
  // Shared with any pips beside the bar, so both sides match.
  pipWidth?: number;
}) {
  const { colors } = useAppTheme();
  const slots = bankSlots(budget);
  const own = budget.ownBudgetMinutes;

  const segments: BarSegment[] = [
    {
      key: "budget",
      weight: own,
      color: colors.primary,
      spent: own > 0 ? Math.min(budget.usedMinutes, own) / own : 0,
    },
    {
      key: "repaid",
      weight: budget.repaidMinutes,
      color: colors.borrowed,
      spent: 0,
    },
  ].filter((segment) => segment.weight > 0);

  // Banked time fills the pips from the left, a period's budget each, so it
  // drains from the pip next to the bar.
  const bankedPips = Array.from({ length: slots }, (_, index) => ({
    key: `banked-${index}`,
    filled:
      (budget.bankedMinutes - index * budget.budgetMinutes) /
      budget.budgetMinutes,
  }));

  return (
    <View style={styles.row}>
      <PeriodPips
        pips={bankedPips}
        color={colors.banked}
        width={pipWidth ?? widthFor(slots)}
      />
      <View style={styles.period}>
        <SegmentedBar segments={segments} spentColor={colors.outlineVariant} />
      </View>
    </View>
  );
}

type BarSegment = {
  key: string;
  // Relative width.
  weight: number;
  // The time left in this segment.
  color: string;
  // 0 to 1, drained from the segment's right end.
  spent: number;
};

// A row of rounded segments separated by small gaps. With no segments it
// draws one empty bar (no time at all this period).
function SegmentedBar({
  segments,
  spentColor,
}: {
  segments: BarSegment[];
  spentColor: string;
}) {
  return (
    <View
      style={styles.bar}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      {segments.length === 0 ? (
        <View
          style={[styles.track, { flex: 1, backgroundColor: spentColor }]}
        />
      ) : (
        segments.map((segment) => (
          <View
            key={segment.key}
            style={[
              styles.track,
              { flex: segment.weight, backgroundColor: segment.color },
            ]}
          >
            <View
              style={[
                styles.spent,
                {
                  width: `${Math.min(Math.max(segment.spent, 0), 1) * 100}%`,
                  backgroundColor: spentColor,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  period: {
    flex: 1,
  },
  bar: {
    flexDirection: "row",
    gap: 3,
  },
  track: {
    flexDirection: "row",
    justifyContent: "flex-end",
    height: BAR_HEIGHT,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  spent: {
    height: "100%",
  },
});
