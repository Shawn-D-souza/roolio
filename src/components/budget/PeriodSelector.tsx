import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { BUDGET_PERIODS, type BudgetPeriod } from "../../budgets/types";
import { periodLabel } from "../../budgets/format";

type PeriodSelectorProps = {
  value: BudgetPeriod;
  onChange: (period: BudgetPeriod) => void;
};

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
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
        return (
          <Pressable
            key={period}
            onPress={() => onChange(period)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={[
              styles.option,
              {
                backgroundColor: selected
                  ? colors.primaryContainer
                  : "transparent",
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                {
                  color: selected
                    ? colors.onPrimaryContainer
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space.md,
    borderRadius: radius.medium,
  },
  label: {
    fontSize: 15,
  },
});
