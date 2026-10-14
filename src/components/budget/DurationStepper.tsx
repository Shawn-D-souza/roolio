import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import type { BudgetPeriod } from "../../budgets/types";
import { formatDuration } from "../../budgets/format";
import {
  budgetPresets,
  budgetStep,
  decrementBudget,
  incrementBudget,
  maxBudget,
  MIN_BUDGET_MINUTES,
} from "../../budgets/rules";
import { StepButton } from "./StepButton";
import { DurationField } from "./DurationField";

type DurationStepperProps = {
  minutes: number;
  period: BudgetPeriod;
  onChange: (minutes: number) => void;
  // Whether the exact-time fields are open.
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
};

// Budget input: presets to start, −/+ for fixed steps, tap the value to type.
export function DurationStepper({
  minutes,
  period,
  onChange,
  editing,
  onEditingChange,
}: DurationStepperProps) {
  const { colors } = useAppTheme();
  const step = formatDuration(budgetStep(period));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceContainer,
          borderColor: colors.outlineVariant,
        },
      ]}
    >
      <View style={styles.stepperRow}>
        <StepButton
          direction="decrease"
          size={48}
          onPress={() => onChange(decrementBudget(minutes, period))}
          disabled={editing || minutes <= MIN_BUDGET_MINUTES}
          accessibilityLabel={`Decrease budget by ${step}`}
        />
        <DurationField
          minutes={minutes}
          period={period}
          editing={editing}
          onEditingChange={onEditingChange}
          onChange={onChange}
        />
        <StepButton
          direction="increase"
          size={48}
          onPress={() => onChange(incrementBudget(minutes, period))}
          disabled={editing || minutes >= maxBudget(period)}
          accessibilityLabel={`Increase budget by ${step}`}
        />
      </View>

      <View style={styles.presets}>
        {budgetPresets(period).map((preset) => {
          const selected = preset === minutes;
          return (
            <Pressable
              key={preset}
              onPress={() => onChange(preset)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Set budget to ${formatDuration(preset)}`}
              style={[
                styles.chip,
                selected
                  ? {
                      backgroundColor: colors.primaryContainer,
                      borderColor: colors.primaryContainer,
                    }
                  : { borderColor: colors.outline },
              ]}
            >
              <Text
                style={[
                  styles.chipLabel,
                  {
                    color: selected
                      ? colors.onPrimaryContainer
                      : colors.onSurfaceVariant,
                    fontWeight: selected ? "600" : "500",
                  },
                ]}
              >
                {formatDuration(preset)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.large,
    borderWidth: 1,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    gap: space.xl,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  presets: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: space.sm,
  },
  chip: {
    minWidth: 64,
    height: 32,
    paddingHorizontal: space.md,
    borderRadius: radius.small,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipLabel: {
    fontSize: 14,
  },
});
