import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { BUDGET_PERIODS, type BudgetPeriod } from "../../budgets/types";

const KIND_LABEL: Record<BudgetPeriod, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

// Day, Week or Month, styled like the theme choice in Settings.
export function RangeSelector({
  kind,
  onChange,
}: {
  kind: BudgetPeriod;
  onChange: (kind: BudgetPeriod) => void;
}) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.options,
        {
          backgroundColor: colors.surfaceContainer,
          borderColor: colors.outlineVariant,
        },
      ]}
      accessibilityRole="tablist"
    >
      {BUDGET_PERIODS.map((option) => {
        const selected = option === kind;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
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
              {KIND_LABEL[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const PERIOD_NOUN: Record<BudgetPeriod, string> = {
  day: "day",
  week: "week",
  month: "month",
};

// "‹ Oct 20 – 26 ›": steps back and forward through days, weeks or months.
// Forward stops at the current one. The label opens a calendar.
export function RangeStepper({
  kind,
  label,
  canGoForward,
  onBack,
  onForward,
  onPick,
}: {
  kind: BudgetPeriod;
  label: string;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onPick: () => void;
}) {
  const { colors } = useAppTheme();
  const noun = PERIOD_NOUN[kind];

  return (
    <View style={styles.stepper}>
      <StepArrow
        icon="chevron-left"
        label={`Previous ${noun}`}
        onPress={onBack}
      />
      <View style={styles.labelClip}>
        <Pressable
          onPress={onPick}
          accessibilityRole="button"
          accessibilityLabel={`${label}, choose a ${noun}`}
          accessibilityLiveRegion="polite"
          android_ripple={{ color: colors.surfaceContainerHighest }}
          style={styles.labelButton}
        >
          <Text
            style={[styles.rangeLabel, { color: colors.onSurface }]}
            numberOfLines={1}
          >
            {label}
          </Text>
          <MaterialIcons
            name="expand-more"
            size={22}
            color={colors.onSurfaceVariant}
          />
        </Pressable>
      </View>
      <StepArrow
        icon="chevron-right"
        label={`Next ${noun}`}
        onPress={onForward}
        disabled={!canGoForward}
      />
    </View>
  );
}

// A round chevron button, also used by the calendar.
export function StepArrow({
  icon,
  label,
  onPress,
  disabled = false,
  size = 28,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.arrowClip}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        android_ripple={{ color: colors.surfaceContainerHighest }}
        style={styles.arrow}
      >
        <MaterialIcons
          name={icon}
          size={size}
          color={disabled ? colors.outlineVariant : colors.onSurface}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  options: {
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
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: space.md,
  },
  labelClip: {
    flexShrink: 1,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  labelButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingLeft: space.md,
    paddingRight: space.sm,
  },
  rangeLabel: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: "600",
  },
  arrowClip: {
    borderRadius: radius.full,
    overflow: "hidden",
  },
  arrow: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
