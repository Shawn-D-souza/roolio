import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { formatDuration } from "../../budgets/format";
import type { AppStats } from "../../stats/summary";
import { AppIcon } from "../addApp/AppIcon";

// Each budgeted app's time in the range, most first, with a bar sized
// against the most used app.
export function AppBreakdown({
  apps,
  onOpenApp,
}: {
  apps: AppStats[];
  onOpenApp: (packageName: string) => void;
}) {
  const { colors } = useAppTheme();
  const max = Math.max(1, ...apps.map((app) => app.usedMinutes));

  return (
    <View style={styles.list}>
      {apps.map((app) => (
        <View key={app.packageName} style={styles.rowClip}>
          <Pressable
            onPress={() => onOpenApp(app.packageName)}
            android_ripple={{ color: colors.surfaceContainerHighest }}
            accessibilityRole="button"
            accessibilityLabel={`${app.appName}: ${
              app.usedMinutes > 0
                ? formatDuration(app.usedMinutes)
                : "not used"
            }`}
            accessibilityHint="Opens app details"
            style={styles.row}
          >
            <AppIcon
              packageName={app.packageName}
              appName={app.appName}
              updatedAt={app.iconVersion}
              size={36}
            />
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text
                  style={[styles.name, { color: colors.onSurface }]}
                  numberOfLines={1}
                >
                  {app.appName}
                </Text>
                <Text
                  style={[
                    styles.duration,
                    {
                      color:
                        app.usedMinutes > 0
                          ? colors.onSurface
                          : colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {app.usedMinutes > 0
                    ? formatDuration(app.usedMinutes)
                    : "Not used"}
                </Text>
              </View>
              <View
                style={[
                  styles.track,
                  { backgroundColor: colors.surfaceContainerHigh },
                ]}
              >
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${(app.usedMinutes / max) * 100}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.xs,
  },
  rowClip: {
    borderRadius: radius.medium,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
  },
  body: {
    flex: 1,
    gap: space.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space.md,
  },
  name: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  duration: {
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 6,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.full,
  },
});
