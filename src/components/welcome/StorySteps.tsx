import { useMemo } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { BEAT, keyframes } from "./storyClock";

type IconName = keyof typeof MaterialIcons.glyphMap;

// How long a step takes to light up or go out, as part of the loop.
const SWITCH = 0.03;

/**
 * The story in three lines. Each icon lights up, in the color the picture
 * gives that idea, while the picture plays it out.
 */
export function StorySteps({ clock }: { clock: Animated.Value }) {
  const { colors } = useAppTheme();
  const lit = useMemo(() => {
    const { bank, borrow, reset } = BEAT;
    return [
      keyframes(clock, [
        [0, 1],
        [bank - SWITCH, 1],
        [bank, 0],
        [reset, 0],
        [reset + SWITCH, 1],
      ]),
      keyframes(clock, [
        [bank - SWITCH, 0],
        [bank, 1],
        [borrow - SWITCH, 1],
        [borrow, 0],
      ]),
      keyframes(clock, [
        [borrow - SWITCH, 0],
        [borrow, 1],
        [reset, 1],
        [reset + SWITCH, 0],
      ]),
    ];
  }, [clock]);

  const steps: { icon: IconName; label: string; color: string }[] = [
    {
      icon: "timer",
      label: "Give each app a daily limit",
      color: colors.primary,
    },
    {
      icon: "savings",
      label: "Unused time is banked for later",
      color: colors.banked,
    },
    {
      icon: "update",
      label: "Need more? Borrow from tomorrow",
      color: colors.borrowed,
    },
  ];

  return (
    <View
      style={styles.steps}
      accessible
      accessibilityLabel={steps.map((step) => step.label).join(". ")}
    >
      {steps.map((step, index) => (
        <View key={step.label} style={styles.step}>
          <View
            style={[
              styles.icon,
              { backgroundColor: colors.surfaceContainerHigh },
            ]}
          >
            <MaterialIcons name={step.icon} size={20} color={step.color} />
            <Animated.View
              style={[
                styles.icon,
                styles.lit,
                { backgroundColor: step.color, opacity: lit[index] },
              ]}
            >
              <MaterialIcons
                name={step.icon}
                size={20}
                color={colors.background}
              />
            </Animated.View>
          </View>
          <Text style={[styles.label, { color: colors.onSurface }]}>
            {step.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Shrinks to its widest row, so the left-aligned rows sit centered.
  steps: {
    alignSelf: "center",
    gap: space.lg,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  lit: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  label: {
    flexShrink: 1,
    fontSize: 17,
    lineHeight: 24,
  },
});
