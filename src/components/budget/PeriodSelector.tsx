import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { BUDGET_PERIODS, type BudgetPeriod } from "../../budgets/types";
import { periodLabel } from "../../budgets/format";

type PeriodSelectorProps = {
  value: BudgetPeriod;
  onChange: (period: BudgetPeriod) => void;
  // Periods that need Premium. They show a lock and call `onLockedPress`.
  locked?: readonly BudgetPeriod[];
  onLockedPress?: (period: BudgetPeriod) => void;
};

export function PeriodSelector({
  value,
  onChange,
  locked = [],
  onLockedPress,
}: PeriodSelectorProps) {
  const { colors } = useAppTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceContainer,
          borderColor: colors.outlineVariant,
        },
      ]}
    >
      {BUDGET_PERIODS.map((period) => {
        const selected = period === value;
        const isLocked = !selected && locked.includes(period);
        return (
          <Pressable
            key={period}
            onPress={() =>
              isLocked ? onLockedPress?.(period) : onChange(period)
            }
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityHint={isLocked ? "Needs Premium" : undefined}
            style={[
              styles.option,
              {
                backgroundColor: selected
                  ? colors.primaryContainer
                  : "transparent",
              },
            ]}
          >
            {isLocked && (
              <MaterialIcons
                name="lock"
                size={16}
                color={colors.onSurfaceVariant}
              />
            )}
            <Text
              style={[
                styles.label,
                {
                  color: selected
                    ? colors.onPrimaryContainer
                    : isLocked
                      ? colors.onSurfaceVariant
                      : colors.onSurface,
                  fontWeight: selected ? "600" : "400",
                },
              ]}
            >
              {periodLabel(period)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: radius.large,
    padding: space.xs,
    borderWidth: 1,
    gap: space.xs,
  },
  option: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    paddingVertical: space.md,
    borderRadius: radius.medium,
  },
  label: {
    fontSize: 15,
  },
});
