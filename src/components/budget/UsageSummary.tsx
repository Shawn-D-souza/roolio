import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import type { BudgetWithUsage } from "../../budgets/types";
import {
  currentPeriodLabel,
  formatDuration,
  formatUsage,
} from "../../budgets/format";
import { timeLeftState } from "../../budgets/rules";
import { UsageBar } from "./UsageBar";

// The current period at a glance, shown at the top of App detail.
export function UsageSummary({ budget }: { budget: BudgetWithUsage }) {
  const { colors } = useAppTheme();
  const state = timeLeftState(budget.availableMinutes);
  const when = currentPeriodLabel(budget.period);
  const headline =
    state === "out"
      ? `Time's up for ${when}`
      : `${formatDuration(budget.availableMinutes)} left ${when}`;
  const usage = `${formatUsage(budget.usedMinutes, budget.budgetMinutes)} ${when}`;
  const headlineColor =
    state === "out"
      ? colors.borrowed
      : state === "low"
        ? colors.low
        : colors.onSurface;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceContainer,
          borderColor: colors.outlineVariant,
        },
      ]}
      accessible
      accessibilityLabel={`${headline}. ${usage}`}
    >
      <View style={styles.headlineRow}>
        {state !== "ok" && (
          <MaterialIcons
            name={state === "out" ? "block" : "hourglass-bottom"}
            size={20}
            color={headlineColor}
          />
        )}
        <Text style={[styles.headline, { color: headlineColor }]}>
          {headline}
        </Text>
      </View>
      <UsageBar
        usedMinutes={budget.usedMinutes}
        repaidMinutes={budget.repaidMinutes}
        budgetMinutes={budget.ownBudgetMinutes}
        bankedMinutes={budget.bankedInMinutes}
        state={state}
      />
      <Text style={[styles.usage, { color: colors.onSurfaceVariant }]}>
        {usage}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.large,
    borderWidth: 1,
    padding: space.lg,
    gap: space.sm,
  },
  headlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  headline: {
    fontSize: 16,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  usage: {
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
});
