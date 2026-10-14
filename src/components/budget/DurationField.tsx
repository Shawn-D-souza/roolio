import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import type { BudgetPeriod } from "../../budgets/types";
import { formatDuration, perPeriodLabel } from "../../budgets/format";
import {
  budgetLimitHint,
  clampBudget,
  decrementBudget,
  incrementBudget,
} from "../../budgets/rules";

type DurationFieldProps = {
  minutes: number;
  period: BudgetPeriod;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onChange: (minutes: number) => void;
};

const digitsOnly = (text: string) => text.replace(/\D/g, "");

function parseDraft(hoursText: string, minutesText: string) {
  return Number(hoursText || 0) * 60 + Number(minutesText || 0);
}

/**
 * The budget value. Tapping it switches to hour and minute fields for typing
 * an exact amount. Minutes over 59 carry into hours (90 m becomes 1h 30m),
 * and values outside the period's range are clamped to the nearest limit.
 */
export function DurationField({
  minutes,
  period,
  editing,
  onEditingChange,
  onChange,
}: DurationFieldProps) {
  const { colors } = useAppTheme();
  const hoursRef = useRef<TextInput>(null);
  const minutesRef = useRef<TextInput>(null);
  const [hoursText, setHoursText] = useState("");
  const [minutesText, setMinutesText] = useState("");

  const draft = parseDraft(hoursText, minutesText);
  const limitHint = editing ? budgetLimitHint(draft, period) : null;

  const startEditing = () => {
    setHoursText(String(Math.floor(minutes / 60)));
    setMinutesText(String(minutes % 60).padStart(2, "0"));
    onEditingChange(true);
  };

  const finishEditing = () => {
    if (!editing) return;
    onChange(clampBudget(draft, period));
    onEditingChange(false);
  };

  // Android can hide the keyboard (back button) without blurring the input.
  useEffect(() => {
    if (!editing) return;
    const subscription = Keyboard.addListener("keyboardDidHide", finishEditing);
    return () => subscription.remove();
  });

  // Moving between the two fields blurs one before focusing the other, so
  // only finish once neither has focus.
  const handleBlur = () => {
    setTimeout(() => {
      if (!hoursRef.current?.isFocused() && !minutesRef.current?.isFocused()) {
        finishEditing();
      }
    }, 0);
  };

  if (editing) {
    return (
      <View style={styles.container}>
        <View style={styles.inputRow}>
          <TextInput
            ref={hoursRef}
            value={hoursText}
            onChangeText={(text) => setHoursText(digitsOnly(text))}
            onSubmitEditing={() => minutesRef.current?.focus()}
            onBlur={handleBlur}
            submitBehavior="submit"
            keyboardType="number-pad"
            returnKeyType="next"
            maxLength={3}
            autoFocus
            selectTextOnFocus
            accessibilityLabel="Hours"
            // A light highlight keeps the selected digits readable.
            selectionColor={colors.primaryContainer}
            cursorColor={colors.primary}
            style={[
              styles.input,
              { color: colors.primary, borderBottomColor: colors.primary },
            ]}
          />
          <Text style={[styles.unit, { color: colors.onSurfaceVariant }]}>
            h
          </Text>
          <TextInput
            ref={minutesRef}
            value={minutesText}
            onChangeText={(text) => setMinutesText(digitsOnly(text))}
            onSubmitEditing={() => Keyboard.dismiss()}
            onBlur={handleBlur}
            keyboardType="number-pad"
            returnKeyType="done"
            maxLength={2}
            selectTextOnFocus
            accessibilityLabel="Minutes"
            selectionColor={colors.primaryContainer}
            cursorColor={colors.primary}
            style={[
              styles.input,
              { color: colors.primary, borderBottomColor: colors.primary },
            ]}
          />
          <Text style={[styles.unit, { color: colors.onSurfaceVariant }]}>
            m
          </Text>
        </View>
        <Text
          accessibilityLiveRegion="polite"
          style={[
            styles.caption,
            styles.editCaption,
            { color: limitHint ? colors.error : colors.onSurfaceVariant },
          ]}
        >
          {limitHint ?? perPeriodLabel(period)}
        </Text>
      </View>
    );
  }

  const formatted = formatDuration(minutes);

  return (
    <Pressable
      onPress={startEditing}
      android_ripple={{ color: colors.surfaceContainerHighest }}
      style={[styles.container, styles.tappable]}
      accessibilityRole="adjustable"
      accessibilityLabel="Budget"
      accessibilityValue={{ text: `${formatted} ${perPeriodLabel(period)}` }}
      accessibilityHint="Double tap to type an exact time"
      accessibilityActions={[
        { name: "activate" },
        { name: "increment" },
        { name: "decrement" },
      ]}
      onAccessibilityAction={(event) => {
        switch (event.nativeEvent.actionName) {
          case "activate":
            startEditing();
            break;
          case "increment":
            onChange(incrementBudget(minutes, period));
            break;
          case "decrement":
            onChange(decrementBudget(minutes, period));
            break;
        }
      }}
    >
      <Text
        style={[styles.value, { color: colors.primary }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatted}
      </Text>
      <Text
        style={[
          styles.caption,
          styles.viewCaption,
          { color: colors.onSurfaceVariant },
        ]}
      >
        {perPeriodLabel(period)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  value: {
    fontSize: 44,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.xs,
  },
  input: {
    minWidth: 56,
    paddingVertical: 0,
    paddingHorizontal: space.xs,
    borderBottomWidth: 2,
    fontSize: 40,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    textAlign: "center",
  },
  unit: {
    fontSize: 22,
    fontWeight: "600",
    marginRight: space.xs,
  },
  // Rounded and clipped so the tap ripple stays inside a soft shape.
  tappable: {
    borderRadius: radius.medium,
    overflow: "hidden",
    paddingVertical: space.xs,
  },
  viewCaption: {
    marginTop: space.xs,
  },
  caption: {
    fontSize: 14,
    textAlign: "center",
  },
  editCaption: {
    marginTop: space.sm,
  },
});
