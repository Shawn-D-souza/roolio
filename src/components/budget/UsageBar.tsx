import { StyleSheet, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import type { BudgetWithUsage } from "../../budgets/types";
import { BAR_HEIGHT, PeriodPips } from "./PeriodPips";

// How many pips banked time gets: one per period of the rollover ceiling.
// Banked time is kept within budget × ceiling, so they always hold all of it.
export function bankSlots(budget: BudgetWithUsage) {
  return budget.budgetMinutes > 0 ? budget.rolloverCeiling : 0;
}

// Time left in the current period, read like a battery. Left to right:
// banked time as one green pip per period it could fill, then this period's
// budget as one full-width bar (indigo), the same size whatever happened to
// it. What's gone is grey and drains from the right: any of the budget that
// went to paying back earlier borrowing (gone from the start), then what's
// used. Banked time drains from its pips once the budget is gone. Low and out
// of time are told by the text next to it, not the bar. Decorative: that text
// says the same thing for screen readers.
export function UsageBar({ budget }: { budget: BudgetWithUsage }) {
  const { colors } = useAppTheme();
  const slots = bankSlots(budget);
  const own = budget.ownBudgetMinutes;
  const total = budget.repaidMinutes + own;
  const gone = budget.repaidMinutes + Math.min(budget.usedMinutes, own);
  const spent = total > 0 ? Math.min(Math.max(gone / total, 0), 1) : 1;

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
      <PeriodPips pips={bankedPips} color={colors.banked} />
      <View
        style={[styles.bar, { backgroundColor: colors.primary }]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <View
          style={[
            styles.spent,
            {
              width: `${spent * 100}%`,
              backgroundColor: colors.outlineVariant,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  bar: {
    flex: 1,
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
