import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { space } from "../../theme/tokens";
import { MAX_PERIOD_COUNT } from "../../budgets/rules";
import { StepButton } from "./StepButton";

type CountStepperProps = {
  title: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
};

// A settings row with a title, helper text and a 0–7 stepper.
export function CountStepper({
  title,
  description,
  value,
  onChange,
}: CountStepperProps) {
  const { colors } = useAppTheme();
  const decrease = () => onChange(Math.max(value - 1, 0));
  const increase = () => onChange(Math.min(value + 1, MAX_PERIOD_COUNT));

  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.onSurface }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
          {description}
        </Text>
      </View>

      <View
        style={styles.stepper}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={title}
        accessibilityValue={{ min: 0, max: MAX_PERIOD_COUNT, now: value }}
        accessibilityHint={description}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "increment") increase();
          else if (event.nativeEvent.actionName === "decrement") decrease();
        }}
      >
        <StepButton
          direction="decrease"
          onPress={decrease}
          disabled={value <= 0}
          accessibilityLabel={`Decrease ${title.toLowerCase()}`}
        />
        <Text style={[styles.value, { color: colors.onSurface }]}>{value}</Text>
        <StepButton
          direction="increase"
          onPress={increase}
          disabled={value >= MAX_PERIOD_COUNT}
          accessibilityLabel={`Increase ${title.toLowerCase()}`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    gap: space.lg,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  value: {
    minWidth: 24,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
