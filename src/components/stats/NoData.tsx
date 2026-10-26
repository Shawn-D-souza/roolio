import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import type { BudgetPeriod } from "../../budgets/types";
import { shortDate } from "../../stats/ranges";
import { TextButton } from "../ui/TextButton";

const FIRST: Record<BudgetPeriod, string> = {
  day: "Go to the first day",
  week: "Go to the first week",
  month: "Go to the first month",
};

// A range from before Roolio counted anything: nothing went wrong, there's
// just no data yet. Says where stats start, and goes there.
export function NoData({
  kind,
  rangeLabel,
  trackedFrom,
  today,
  onGoToStart,
}: {
  kind: BudgetPeriod;
  rangeLabel: string;
  trackedFrom: string;
  today: string;
  onGoToStart: () => void;
}) {
  const { colors } = useAppTheme();
  const start = shortDate(
    trackedFrom,
    trackedFrom.slice(0, 4) !== today.slice(0, 4),
  );

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
      <MaterialIcons
        name="hourglass-empty"
        size={40}
        color={colors.onSurfaceVariant}
      />
      <Text
        style={[styles.headline, { color: colors.onSurface }]}
        accessibilityRole="header"
      >
        No data for {rangeLabel}
      </Text>
      <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
        Roolio wasn&apos;t counting your apps yet. Your stats start on {start}.
      </Text>
      <View style={styles.action}>
        <TextButton label={FIRST[kind]} onPress={onGoToStart} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: space.md,
    borderRadius: radius.large,
    borderWidth: 1,
    paddingTop: space.xl,
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
  },
  headline: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  action: {
    alignSelf: "stretch",
  },
});
