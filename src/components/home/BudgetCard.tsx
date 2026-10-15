import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import type { BudgetWithUsage } from "../../budgets/types";
import {
  currentPeriodLabel,
  formatDuration,
  formatPeriodCount,
  formatUsage,
  periodLabel,
} from "../../budgets/format";
import { timeLeftState } from "../../budgets/rules";
import { AppIcon } from "../addApp/AppIcon";
import { UsageBar } from "../budget/UsageBar";

type BudgetCardProps = {
  budget: BudgetWithUsage;
  onPress: (budget: BudgetWithUsage) => void;
};

export const BudgetCard = memo(function BudgetCard({
  budget,
  onPress,
}: BudgetCardProps) {
  const { colors } = useAppTheme();
  const rollover = formatPeriodCount(budget.rolloverCeiling, budget.period);
  const borrow = formatPeriodCount(budget.borrowCap, budget.period);
  const state = timeLeftState(budget.availableMinutes);
  const when = currentPeriodLabel(budget.period);
  const usage = `${formatUsage(budget.usedMinutes, budget.budgetMinutes)} ${when}`;

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
        accessibilityLabel={`${budget.appName}, ${amount} ${amountCaption}. ${usage}`}
        accessibilityHint="Opens budget settings"
        style={styles.pressable}
      >
        <View style={styles.header}>
          <AppIcon
            packageName={budget.packageName}
            appName={budget.appName}
            updatedAt={budget.iconVersion}
            size={48}
          />
          <View style={styles.titleBlock}>
            <Text
              style={[styles.appName, { color: colors.onSurface }]}
              numberOfLines={1}
            >
              {budget.appName}
            </Text>
            <Text style={[styles.meta, { color: colors.onSurfaceVariant }]}>
              {periodLabel(budget.period)}
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

        <View style={styles.usage}>
          <UsageBar
            usedMinutes={budget.usedMinutes}
            budgetMinutes={budget.budgetMinutes}
            state={state}
          />
          <Text style={[styles.usageText, { color: colors.onSurfaceVariant }]}>
            {usage}
          </Text>
        </View>

        <View style={styles.settings}>
          <SettingLabel
            icon="savings"
            label={`Rollover ${rollover.toLowerCase()}`}
          />
          <SettingLabel icon="redo" label={`Borrow ${borrow.toLowerCase()}`} />
        </View>
      </Pressable>
    </View>
  );
});

function SettingLabel({
  icon,
  label,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.setting}>
      <MaterialIcons name={icon} size={16} color={colors.onSurfaceVariant} />
      <Text style={[styles.settingText, { color: colors.onSurfaceVariant }]}>
        {label}
      </Text>
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
  meta: {
    fontSize: 13,
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
  usage: {
    gap: space.sm,
  },
  usageText: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  settings: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: space.lg,
    rowGap: space.xs,
  },
  setting: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  settingText: {
    fontSize: 13,
  },
});
