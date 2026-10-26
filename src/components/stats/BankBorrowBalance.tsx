import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { formatDuration } from "../../budgets/format";
import type { AppStats } from "../../stats/summary";
import { AppIcon } from "../addApp/AppIcon";

const BAR_HEIGHT = 12;

// What each app banked and borrowed in the range, on either side of a center
// line: banked time grows to the left in green, borrowed time to the right in
// rust, the same sides as on a Home card. Each side is labeled too, so color
// is never the only signal.
export function BankBorrowBalance({ apps }: { apps: AppStats[] }) {
  const { colors } = useAppTheme();
  const rows = apps
    .filter((app) => app.bankedMinutes > 0 || app.borrowedMinutes > 0)
    .sort(
      (a, b) =>
        b.bankedMinutes + b.borrowedMinutes -
        (a.bankedMinutes + a.borrowedMinutes),
    );
  const max = Math.max(
    1,
    ...rows.map((app) => Math.max(app.bankedMinutes, app.borrowedMinutes)),
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
      <View style={styles.legend} importantForAccessibility="no-hide-descendants">
        <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
          ← Banked
        </Text>
        <Text style={[styles.legendText, { color: colors.onSurfaceVariant }]}>
          Borrowed →
        </Text>
      </View>

      {rows.map((app) => (
        <View
          key={app.packageName}
          style={styles.row}
          accessible
          accessibilityLabel={`${app.appName}: ${formatDuration(
            app.bankedMinutes,
          )} banked, ${formatDuration(app.borrowedMinutes)} borrowed`}
        >
          <View style={styles.titleRow}>
            <AppIcon
              packageName={app.packageName}
              appName={app.appName}
              updatedAt={app.iconVersion}
              size={24}
            />
            <Text
              style={[styles.name, { color: colors.onSurface }]}
              numberOfLines={1}
            >
              {app.appName}
            </Text>
          </View>

          <View style={styles.balance}>
            <View style={[styles.side, styles.left]}>
              {app.bankedMinutes > 0 && (
                <View
                  style={[
                    styles.bar,
                    styles.leftBar,
                    {
                      width: `${(app.bankedMinutes / max) * 100}%`,
                      backgroundColor: colors.banked,
                    },
                  ]}
                />
              )}
            </View>
            <View
              style={[styles.axis, { backgroundColor: colors.outline }]}
            />
            <View style={styles.side}>
              {app.borrowedMinutes > 0 && (
                <View
                  style={[
                    styles.bar,
                    styles.rightBar,
                    {
                      width: `${(app.borrowedMinutes / max) * 100}%`,
                      backgroundColor: colors.borrowed,
                    },
                  ]}
                />
              )}
            </View>
          </View>

          <View style={styles.amounts}>
            <Text style={[styles.amount, { color: colors.onSurfaceVariant }]}>
              {app.bankedMinutes > 0
                ? `+${formatDuration(app.bankedMinutes)}`
                : ""}
            </Text>
            <Text style={[styles.amount, { color: colors.onSurfaceVariant }]}>
              {app.borrowedMinutes > 0
                ? formatDuration(app.borrowedMinutes)
                : ""}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.large,
    borderWidth: 1,
    padding: space.lg,
    gap: space.lg,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  legendText: {
    fontSize: 14,
    fontWeight: "600",
  },
  row: {
    gap: space.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  name: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  balance: {
    flexDirection: "row",
    alignItems: "center",
    height: BAR_HEIGHT + space.sm,
  },
  side: {
    flex: 1,
    flexDirection: "row",
  },
  left: {
    justifyContent: "flex-end",
  },
  axis: {
    width: 2,
    height: "100%",
    borderRadius: 1,
  },
  bar: {
    height: BAR_HEIGHT,
  },
  leftBar: {
    borderTopLeftRadius: radius.full,
    borderBottomLeftRadius: radius.full,
  },
  rightBar: {
    borderTopRightRadius: radius.full,
    borderBottomRightRadius: radius.full,
  },
  amounts: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  amount: {
    fontSize: 14,
    fontVariant: ["tabular-nums"],
  },
});
