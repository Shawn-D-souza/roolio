import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { space } from "../../theme/tokens";
import type { BudgetWithUsage } from "../../budgets/types";
import { formatDuration, formatUpcoming } from "../../budgets/format";
import { SegmentedBar } from "./UsageBar";

// "Next 3 days. 10 min borrowed", for screen readers.
export function borrowAheadLabel(budget: BudgetWithUsage) {
  return `${formatUpcoming(budget.upcoming.length, budget.period)}. ${borrowAheadStatus(budget)}`;
}

function borrowAheadStatus(budget: BudgetWithUsage) {
  const taken = budget.owedMinutes + budget.borrowedMinutes;
  if (taken === 0) return `Up to ${formatDuration(budget.borrowLeftMinutes)}`;
  if (budget.borrowLeftMinutes === 0) {
    return `All ${formatDuration(taken)} borrowed`;
  }
  return `${formatDuration(taken)} borrowed`;
}

// The upcoming periods that borrowed time comes out of, one segment each,
// filled by how much of each is already taken. Nothing here changes until
// time is used or a period ends.
export function BorrowAhead({ budget }: { budget: BudgetWithUsage }) {
  const { colors } = useAppTheme();
  if (budget.upcoming.length === 0) return null;

  const status = borrowAheadStatus(budget);
  const taken = budget.owedMinutes + budget.borrowedMinutes > 0;

  return (
    <View style={styles.container}>
      <View style={styles.labels}>
        <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>
          {formatUpcoming(budget.upcoming.length, budget.period)}
        </Text>
        <Text
          style={[
            styles.status,
            { color: taken ? colors.borrowed : colors.onSurfaceVariant },
          ]}
        >
          {status}
        </Text>
      </View>
      <SegmentedBar
        segments={budget.upcoming.map((period) => ({
          key: period.startDay,
          weight: 1,
          track: colors.surfaceContainerHighest,
          fill: colors.borrowed,
          progress:
            period.budgetMinutes > 0
              ? period.takenMinutes / period.budgetMinutes
              : 0,
        }))}
        emptyColor={colors.surfaceContainerHighest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space.sm,
  },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: space.md,
  },
  label: {
    fontSize: 13,
  },
  status: {
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
