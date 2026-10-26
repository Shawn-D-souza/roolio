import { useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { formatDuration } from "../../budgets/format";
import { OTHER_APPS, type Stats } from "../../stats/summary";
import { AppIcon } from "../addApp/AppIcon";
import { seriesColors, seriesNames } from "./seriesColors";
import { SeriesLegend } from "./SeriesLegend";

const STROKE = 22;
const ICON_SIZE = 28;
// From the ring's middle line out to an icon's center.
const ICON_OFFSET = STROKE / 2 + space.sm + ICON_SIZE / 2;
const MAX_RADIUS = 96;
// Space between slices, in degrees.
const GAP = 3;
// Slices narrower than this, in degrees, get no icon: it wouldn't fit. The
// legend names them.
const MIN_ICON_SWEEP = 22;

type Slice = { key: string; minutes: number; start: number; sweep: number };

function point(center: number, r: number, degrees: number) {
  const radians = ((degrees - 90) * Math.PI) / 180;
  return { x: center + r * Math.cos(radians), y: center + r * Math.sin(radians) };
}

// An arc clockwise from `start`, in degrees from the top.
function arcPath(center: number, r: number, start: number, sweep: number) {
  const from = point(center, r, start);
  const to = point(center, r, start + sweep);
  const large = sweep > 180 ? 1 : 0;
  return `M ${from.x} ${from.y} A ${r} ${r} 0 ${large} 1 ${to.x} ${to.y}`;
}

// Each app's share of the range as a ring, the total in the middle. The most
// used apps have a color of their own and their icon by their slice; the rest
// share one grey slice.
export function AppRing({
  stats,
  rangeLabel,
}: {
  stats: Stats;
  rangeLabel: string;
}) {
  const { colors } = useAppTheme();
  const [width, setWidth] = useState(0);
  const colorOf = seriesColors(colors, stats.series);
  const nameOf = seriesNames(stats.apps);

  const used = stats.apps.filter((app) => app.usedMinutes > 0);
  const own = stats.series
    .map((key) => used.find((app) => app.packageName === key))
    .filter((app) => app !== undefined);
  const others = used.filter((app) => !stats.series.includes(app.packageName));
  const parts = own.map((app) => ({
    key: app.packageName,
    minutes: app.usedMinutes,
  }));
  if (others.length > 0) {
    parts.push({
      key: OTHER_APPS,
      minutes: others.reduce((total, app) => total + app.usedMinutes, 0),
    });
  }

  const total = stats.usedMinutes;
  const gap = parts.length > 1 ? GAP : 0;
  const degrees = (minutes: number) => (minutes / total) * 360;
  const slices: Slice[] = parts.map((part, index) => {
    const before = parts
      .slice(0, index)
      .reduce((sum, earlier) => sum + earlier.minutes, 0);
    return {
      ...part,
      start: degrees(before) + gap / 2,
      sweep: Math.max(degrees(part.minutes) - gap, 0.5),
    };
  });

  const ringRadius = Math.min(MAX_RADIUS, width / 2 - ICON_OFFSET - ICON_SIZE / 2);
  const size = 2 * (ringRadius + ICON_OFFSET + ICON_SIZE / 2);
  const center = size / 2;

  const label = [
    `${rangeLabel}, ${formatDuration(total)}`,
    ...parts.map(
      (part) => `${nameOf(part.key)} ${formatDuration(part.minutes)}`,
    ),
  ].join(". ");

  const handleLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);

  return (
    <View onLayout={handleLayout}>
      {ringRadius > 0 && (
        <View
          style={[styles.ring, { width: size, height: size }]}
          accessible
          accessibilityLabel={label}
        >
          <Svg width={size} height={size}>
            {slices.length === 0 ? (
              <Circle
                cx={center}
                cy={center}
                r={ringRadius}
                stroke={colors.surfaceContainerHighest}
                strokeWidth={STROKE}
                fill="none"
              />
            ) : slices.length === 1 && gap === 0 ? (
              <Circle
                cx={center}
                cy={center}
                r={ringRadius}
                stroke={colorOf(slices[0].key)}
                strokeWidth={STROKE}
                fill="none"
              />
            ) : (
              slices.map((slice) => (
                <Path
                  key={slice.key}
                  d={arcPath(center, ringRadius, slice.start, slice.sweep)}
                  stroke={colorOf(slice.key)}
                  strokeWidth={STROKE}
                  fill="none"
                />
              ))
            )}
          </Svg>

          {slices
            .filter((slice) => slice.sweep >= MIN_ICON_SWEEP)
            .map((slice) => {
              const at = point(
                center,
                ringRadius + ICON_OFFSET,
                slice.start + slice.sweep / 2,
              );
              const app = used.find((item) => item.packageName === slice.key);
              return (
                <View
                  key={slice.key}
                  style={[
                    styles.badge,
                    { left: at.x - ICON_SIZE / 2, top: at.y - ICON_SIZE / 2 },
                  ]}
                >
                  {app ? (
                    <AppIcon
                      packageName={app.packageName}
                      appName={app.appName}
                      updatedAt={app.iconVersion}
                      size={ICON_SIZE}
                    />
                  ) : (
                    <View
                      style={[
                        styles.more,
                        { backgroundColor: colors.surfaceContainerHighest },
                      ]}
                    >
                      <Text
                        style={[styles.moreText, { color: colors.onSurface }]}
                        maxFontSizeMultiplier={1.3}
                      >
                        +{others.length}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}

          <View style={styles.center} pointerEvents="none">
            <Text
              style={[styles.rangeLabel, { color: colors.onSurfaceVariant }]}
              numberOfLines={1}
            >
              {rangeLabel.toUpperCase()}
            </Text>
            <Text
              style={[styles.total, { color: colors.onSurface }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatDuration(total)}
            </Text>
          </View>
        </View>
      )}

      {parts.length > 0 && (
        <SeriesLegend
          keys={parts.map((part) => part.key)}
          colorOf={colorOf}
          nameOf={nameOf}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignSelf: "center",
  },
  badge: {
    position: "absolute",
  },
  more: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  moreText: {
    fontSize: 12,
    fontWeight: "700",
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    // Inside the ring's hole.
    paddingHorizontal: ICON_OFFSET + ICON_SIZE / 2 + STROKE + space.sm,
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  total: {
    fontSize: 26,
    fontWeight: "700",
    marginTop: space.xs,
    fontVariant: ["tabular-nums"],
  },
});
