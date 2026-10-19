import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import type { BudgetWithUsage } from "../../budgets/types";
import { currentPeriodLabel, formatDuration } from "../../budgets/format";
import { timeLeftState } from "../../budgets/rules";
import { AppIcon } from "../addApp/AppIcon";
import { UsageBar } from "../budget/UsageBar";
import { BorrowAhead, borrowAheadLabel } from "../budget/BorrowAhead";

type BudgetCardProps = {
  budget: BudgetWithUsage;
  onPress: (budget: BudgetWithUsage) => void;
};

// Where an app stands right now: time left this period, and what can still
// be borrowed from the periods ahead. The settings behind it live in App
// detail.
export const BudgetCard = memo(function BudgetCard({
  budget,
  onPress,
}: BudgetCardProps) {
  const { colors } = useAppTheme();
  const state = timeLeftState(budget.availableMinutes);
  const when = currentPeriodLabel(budget.period);
  const used = `${formatDuration(budget.usedMinutes)} used ${when}`;

  // Low and out of time are told by an icon and words too, never by color alone.
  const amountColor =
    state === "out"
      ? colors.borrowed
      : state === "low"
        ? colors.low
        : colors.primary;
  const amount =
    state === "out" ? "Time's up" : formatDuration(budget.availableMinutes);
  const amountCaption = state === "out" ? `for ${when}` : `left ${when}`;

  // Each labels a segment of the bar, so it stays while the period has that
  // segment, even once it's spent.
  const banked =
    budget.bankedInMinutes > 0
      ? `Banked: ${formatDuration(budget.bankedMinutes)}`
      : null;
  const repaid =
    budget.repaidMinutes > 0
      ? `Paid back: ${formatDuration(budget.repaidMinutes)}`
      : null;
  const showAhead = budget.upcoming.length > 0;

  const label = [
    budget.appName,
    `${amount} ${amountCaption}`,
    used,
    repaid,
    banked,
    showAhead ? borrowAheadLabel(budget) : null,
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
            <Text
              style={[styles.appName, { color: colors.onSurface }]}
              numberOfLines={1}
            >
              {budget.appName}
            </Text>
            <Text
              style={[styles.used, { color: colors.onSurfaceVariant }]}
              numberOfLines={1}
            >
              {used}
            </Text>
          </View>
          <View style={styles.amount}>
            <View style={styles.amountRow}>
              {state !== "ok" && (
                <MaterialIcons
                  name={state === "out" ? "block" : "hourglass-bottom"}
                  size={18}
                  color={amountColor}
                />
              )}
              <Text
                style={[
                  styles.amountValue,
                  state === "out" && styles.amountValueOut,
                  { color: amountColor },
                ]}
              >
                {amount}
              </Text>
            </View>
            <Text
              style={[styles.amountCaption, { color: colors.onSurfaceVariant }]}
            >
              {amountCaption}
            </Text>
          </View>
        </View>

        <UsageBar
          usedMinutes={budget.usedMinutes}
          repaidMinutes={budget.repaidMinutes}
          budgetMinutes={budget.ownBudgetMinutes}
          bankedMinutes={budget.bankedInMinutes}
          state={state}
        />

        {(repaid || banked) && (
          <View style={styles.chips}>
            {repaid && <Chip label={repaid} tone="borrowed" />}
            {banked && <Chip label={banked} tone="banked" />}
          </View>
        )}

        {showAhead && (
          <>
            <View
              style={[
                styles.divider,
                { backgroundColor: colors.outlineVariant },
              ]}
            />
            <BorrowAhead budget={budget} />
          </>
        )}
      </Pressable>
    </View>
  );
});

// The word in the label ("Banked", "Paid back") carries the meaning; the
// color matches its segment in the bar.
function Chip({ label, tone }: { label: string; tone: "banked" | "borrowed" }) {
  const { colors } = useAppTheme();
  const [background, foreground] =
    tone === "banked"
      ? [colors.primaryContainer, colors.onPrimaryContainer]
      : [colors.borrowedContainer, colors.onBorrowedContainer];
  return (
    <View style={[styles.chip, { backgroundColor: background }]}>
      <Text style={[styles.chipText, { color: foreground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.large,
    borderWidth: 1,
    overflow: "hidden",
  },
  pressable: {
    padding: space.lg,
    gap: space.md,
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
  appName: {
    fontSize: 17,
    fontWeight: "600",
  },
  used: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  amount: {
    alignItems: "flex-end",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  amountValueOut: {
    fontSize: 18,
  },
  amountCaption: {
    fontSize: 12,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
  },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
