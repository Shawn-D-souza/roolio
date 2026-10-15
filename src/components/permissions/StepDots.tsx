import { StyleSheet, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";

type StepDotsProps = {
  count: number;
  // Zero-based index of the current step.
  current: number;
  // Steps already done, which may include later ones granted out of order.
  done: boolean[];
};

/** Setup progress: done and current steps filled, the current one wider. */
export function StepDots({ count, current, done }: StepDotsProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={styles.dots}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Setup step ${current + 1} of ${count}`}
    >
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === current && styles.dotCurrent,
            {
              backgroundColor:
                done[index] || index === current
                  ? colors.primary
                  : colors.surfaceContainerHighest,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space.sm,
    paddingTop: space.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  dotCurrent: {
    width: 24,
  },
});
