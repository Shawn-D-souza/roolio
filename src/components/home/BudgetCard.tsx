import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import type { AppBudget } from "../../budgets/types";
import {
  formatDuration,
  formatPeriodCount,
  perPeriodLabel,
  periodLabel,
} from "../../budgets/format";
import { AppIcon } from "../addApp/AppIcon";

type BudgetCardProps = {
  budget: AppBudget;
  onPress: (budget: AppBudget) => void;
};

export const BudgetCard = memo(function BudgetCard({
  budget,
  onPress,
}: BudgetCardProps) {
  const { colors } = useAppTheme();
  const rollover = formatPeriodCount(budget.rolloverCeiling, budget.period);
  const borrow = formatPeriodCount(budget.borrowCap, budget.period);

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
        accessibilityLabel={`${budget.appName}, ${formatDuration(budget.budgetMinutes)} ${perPeriodLabel(budget.period)}`}
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
            <Text style={[styles.amountValue, { color: colors.primary }]}>
              {formatDuration(budget.budgetMinutes)}
            </Text>
            <Text
              style={[styles.amountCaption, { color: colors.onSurfaceVariant }]}
            >
              {perPeriodLabel(budget.period)}
            </Text>
          </View>
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
  amountValue: {
    fontSize: 24,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  amountCaption: {
    fontSize: 12,
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
