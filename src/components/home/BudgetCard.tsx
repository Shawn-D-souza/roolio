import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import type { BudgetWithUsage } from "../../budgets/types";
import { currentPeriodLabel, formatDuration } from "../../budgets/format";
import { timeLeftState } from "../../budgets/rules";
import { AppIcon } from "../addApp/AppIcon";
import { bankSlots, UsageBar } from "../budget/UsageBar";
import { pipWidth } from "../budget/PeriodPips";
import {
  BorrowAhead,
  borrowAheadLabel,
  borrowAheadSummary,
} from "../budget/BorrowAhead";

type BudgetCardProps = {
  budget: BudgetWithUsage;
  onPress: (budget: BudgetWithUsage) => void;
};

// Where an app stands right now. The header says how it's doing: the name,
// what's happened this period, and the time left. Under it, one row of time
// (banked pips, this period's bar, borrow pips), with each end labeled right
// below it instead of a legend. The same height in every state. The settings
// behind it live in App detail.
export const BudgetCard = memo(function BudgetCard({
  budget,
  onPress,
}: BudgetCardProps) {
  const { colors } = useAppTheme();
  const state = timeLeftState(budget.availableMinutes);
  const when = currentPeriodLabel(budget.period);

  // What's happened this period: what's used, and any of its budget that
  // went to paying back earlier borrowing (the rust end of the bar).
  const activity = [
    budget.usedMinutes > 0
      ? `${formatDuration(budget.usedMinutes)} used ${when}`
      : `Not used ${when}`,
    budget.repaidMinutes > 0
      ? `${formatDuration(budget.repaidMinutes)} paid back`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // Low and out of time are told by an icon and words too, never by color alone.
  const amountColor =
    state === "out"
      ? colors.borrowed
      : state === "low"
        ? colors.low
        : colors.onSurface;
  const amount =
    state === "out" ? "Time's up" : formatDuration(budget.availableMinutes);

  // Labels for the two ends of the row, each under the pips it describes.
  // Banked is told while there are pips for it, even when empty, so an
  // outlined pip never stands unexplained.
  const slots = bankSlots(budget);
  const banked =
    slots === 0
      ? null
      : budget.bankedMinutes > 0
        ? `${formatDuration(budget.bankedMinutes)} banked`
        : budget.bankedInMinutes > 0
          ? "Banked time used"
          : "Nothing banked yet";
  const ahead = budget.upcoming.length > 0 ? borrowAheadSummary(budget) : null;
  // Banked pips on the left of the bar, borrow pips on the right: one size.
  const pips = pipWidth(slots + budget.upcoming.length);

  const label = [
    budget.appName,
    state === "out" ? `Time's up for ${when}` : `${amount} left`,
    activity,
    banked,
    ahead ? borrowAheadLabel(budget) : null,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceContainer,
          borderColor: colors.outlineVariant,
        },
      ]}
    >
      <Pressable
        onPress={() => onPress(budget)}
        android_ripple={{ color: colors.surfaceContainerHighest }}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Opens app details"
        style={styles.pressable}
      >
        <View style={styles.header}>
          <AppIcon
            packageName={budget.packageName}
            appName={budget.appName}
            updatedAt={budget.iconVersion}
            size={44}
          />
          <View style={styles.titleBlock}>
            <View style={styles.titleRow}>
              <Text
                style={[styles.appName, { color: colors.onSurface }]}
                numberOfLines={1}
              >
                {budget.appName}
              </Text>
              <View style={styles.amount}>
                {state !== "ok" && (
                  <MaterialIcons
                    name={state === "out" ? "block" : "hourglass-bottom"}
                    size={18}
                    color={amountColor}
                  />
                )}
                <Text style={[styles.amountValue, { color: amountColor }]}>
                  {amount}
                  {state !== "out" && (
                    <Text
                      style={[
                        styles.amountUnit,
                        { color: colors.onSurfaceVariant },
                      ]}
                    >
                      {" "}
                      left
                    </Text>
                  )}
                </Text>
              </View>
            </View>
            <Text
              style={[styles.activity, { color: colors.onSurfaceVariant }]}
              numberOfLines={1}
            >
              {activity}
            </Text>
          </View>
        </View>

        <View style={styles.bars}>
          <View style={styles.periodBar}>
            <UsageBar budget={budget} pipWidth={pips} />
          </View>
          <BorrowAhead budget={budget} pipWidth={pips} />
        </View>

        <View style={styles.ends}>
          {banked && (
            <Text style={[styles.endText, { color: colors.onSurfaceVariant }]}>
              {banked}
            </Text>
          )}
          {ahead && (
            <Text
              style={[
                styles.endText,
                styles.endTextRight,
                ahead.taken && styles.endTextStrong,
                {
                  color: ahead.taken
                    ? colors.borrowed
                    : colors.onSurfaceVariant,
                },
              ]}
            >
              {ahead.text}
            </Text>
          )}
        </View>
      </Pressable>
    </View>
  );
});

const END_LINE_HEIGHT = 20;

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.large,
    borderWidth: 1,
    overflow: "hidden",
  },
  pressable: {
    padding: space.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  appName: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
  },
  amount: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  amountUnit: {
    fontSize: 15,
    fontWeight: "400",
  },
  activity: {
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
  // The row belongs with the labels under it, not with the header: more
  // space above than below.
  bars: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginTop: space.lg,
  },
  periodBar: {
    flex: 1,
  },
  // Banked starts at the left edge, under its pips; borrowing ends at the
  // right edge, under its pips.
  ends: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.md,
    marginTop: space.sm,
    // Keeps the line, and the card's height, when there's nothing to say.
    minHeight: END_LINE_HEIGHT,
  },
  endText: {
    fontSize: 14,
    lineHeight: END_LINE_HEIGHT,
    fontVariant: ["tabular-nums"],
  },
  endTextRight: {
    marginLeft: "auto",
    textAlign: "right",
  },
  endTextStrong: {
    fontWeight: "600",
  },
});
