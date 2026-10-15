import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";

export type NumberedStep = {
  text: string;
  // A sketch of the Settings screen for this step, if it helps.
  sketch?: ReactNode;
};

/** Numbered instructions, each optionally followed by a Settings sketch. */
export function NumberedSteps({ steps }: { steps: NumberedStep[] }) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.steps}>
      {steps.map((step, index) => (
        <View key={step.text} style={styles.step}>
          <View
            style={styles.stepHeader}
            accessible
            accessibilityLabel={`Step ${index + 1}: ${step.text}`}
          >
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.badgeLabel, { color: colors.onPrimary }]}>
                {index + 1}
              </Text>
            </View>
            <Text style={[styles.stepText, { color: colors.onSurface }]}>
              {step.text}
            </Text>
          </View>
          {step.sketch}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  steps: {
    gap: space.xl,
  },
  step: {
    gap: space.md,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
});
