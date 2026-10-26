import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { formatDuration } from "../../budgets/format";
import { parseDay, shortDate, weekdayLabel } from "../../stats/ranges";
import { OTHER_APPS, type ChartDay, type Stats } from "../../stats/summary";
import { seriesColors, seriesNames } from "./seriesColors";
import { SeriesLegend } from "./SeriesLegend";

const CHART_HEIGHT = 140;
// Days that get a number under them in a month.
const MONTH_TICKS = new Set([1, 8, 15, 22, 29]);

function dayTick(day: string, monthly: boolean) {
  if (!monthly) return weekdayLabel(day).charAt(0);
  const date = parseDay(day).getDate();
  return MONTH_TICKS.has(date) ? String(date) : "";
}

// The range's total, and the daily average over a week or month.
function UsageTotals({ stats }: { stats: Stats }) {
  const { colors } = useAppTheme();
  const daily = stats.range.kind === "day";

  return (
    <View style={styles.totals}>
      <View>
        <Text style={[styles.total, { color: colors.onSurface }]}>
          {formatDuration(stats.usedMinutes)}
        </Text>
        <Text style={[styles.caption, { color: colors.onSurfaceVariant }]}>
          {daily ? "Used" : "Total"}
        </Text>
      </View>
      {!daily && stats.averageMinutes !== null && (
        <View style={styles.average}>
          <Text style={[styles.total, { color: colors.onSurface }]}>
            {formatDuration(stats.averageMinutes)}
          </Text>
          <Text style={[styles.caption, { color: colors.onSurfaceVariant }]}>
            Daily average
          </Text>
        </View>
      )}
    </View>
  );
}

// Time used per day across every budgeted app: in one color, or `stacked` by
// app. Just the data: no budget line, nothing marked as too much. A day is
// shown within its week, and any day of that week can be picked.
export function DailyChart({
  stats,
  onSelectDay,
  stacked = false,
}: {
  stats: Stats;
  onSelectDay: (day: string) => void;
  stacked?: boolean;
}) {
  const { colors } = useAppTheme();
  const { range, chart } = stats;
  const daily = range.kind === "day";
  const monthly = range.kind === "month";
  const max = Math.max(1, ...chart.map((day) => day.minutes));
  const colorOf = seriesColors(colors, stats.series);
  const nameOf = seriesNames(stats.apps);
  const hasOther = chart.some((day) =>
    day.segments.some((segment) => segment.key === OTHER_APPS),
  );

  return (
    <View>
      <UsageTotals stats={stats} />

      <View style={styles.scale}>
        <Text style={[styles.scaleLabel, { color: colors.onSurfaceVariant }]}>
          {formatDuration(max)}
        </Text>
        <View
          style={[styles.scaleLine, { backgroundColor: colors.outlineVariant }]}
        />
      </View>

      <View style={[styles.columns, monthly && styles.monthColumns]}>
        {chart.map((day) => (
          <Column
            key={day.day}
            day={day}
            max={max}
            tick={dayTick(day.day, monthly)}
            selectable={daily}
            selected={daily && day.day === range.fromDay}
            today={stats.today}
            onPress={onSelectDay}
            stacked={stacked}
            colorOf={colorOf}
            nameOf={nameOf}
          />
        ))}
      </View>

      {stacked && stats.series.length > 0 && (
        <SeriesLegend
          keys={[...stats.series, ...(hasOther ? [OTHER_APPS] : [])]}
          colorOf={colorOf}
          nameOf={nameOf}
        />
      )}
    </View>
  );
}

function Column({
  day,
  max,
  tick,
  selectable,
  selected,
  today,
  onPress,
  stacked,
  colorOf,
  nameOf,
}: {
  day: ChartDay;
  max: number;
  tick: string;
  selectable: boolean;
  selected: boolean;
  today: string;
  onPress: (day: string) => void;
  stacked: boolean;
  colorOf: (key: string) => string;
  nameOf: (key: string) => string;
}) {
  const { colors } = useAppTheme();
  const height = Math.max((day.minutes / max) * CHART_HEIGHT, 3);
  let label = `${weekdayLabel(day.day)}, ${shortDate(day.day)}: ${
    day.tracked ? formatDuration(day.minutes) : "no data"
  }`;
  if (stacked && day.segments.length > 0) {
    label += `. ${day.segments
      .map(
        (segment) =>
          `${nameOf(segment.key)} ${formatDuration(segment.minutes)}`,
      )
      .join(", ")}`;
  }
  // When a day is picked, the others step back.
  const barOpacity = selectable && !selected ? 0.4 : 1;

  let bar = null;
  if (day.tracked && day.minutes > 0) {
    bar = stacked ? (
      // The most used app at the bottom, a 2px gap between apps.
      <View style={[styles.bar, styles.stack, { height, opacity: barOpacity }]}>
        {day.segments.map((segment) => (
          <View
            key={segment.key}
            style={{
              flex: segment.minutes,
              backgroundColor: colorOf(segment.key),
            }}
          />
        ))}
      </View>
    ) : (
      <View
        style={[
          styles.bar,
          { height, backgroundColor: colors.primary, opacity: barOpacity },
        ]}
      />
    );
  } else if (day.tracked) {
    // A stub on the baseline, so a day with nothing used still shows.
    bar = (
      <View style={[styles.stub, { backgroundColor: colors.outlineVariant }]} />
    );
  }

  return (
    <Pressable
      style={styles.column}
      onPress={() => onPress(day.day)}
      disabled={!selectable || !day.tracked}
      accessible
      accessibilityRole={selectable ? "button" : undefined}
      accessibilityLabel={label}
      accessibilityState={selectable ? { selected } : undefined}
    >
      <View style={styles.barArea}>{bar}</View>
      <Text
        style={[
          styles.tick,
          {
            // Days without data are dimmer, in a color that still reads.
            color: selected
              ? colors.onSurface
              : day.tracked
                ? colors.onSurfaceVariant
                : colors.outline,
            fontWeight: selected || day.day === today ? "700" : "400",
          },
        ]}
        // A month's ticks share narrow columns, so they grow only so far.
        maxFontSizeMultiplier={1.5}
      >
        {tick}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  totals: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: space.md,
    marginBottom: space.lg,
  },
  average: {
    alignItems: "flex-end",
  },
  total: {
    fontSize: 24,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  caption: {
    fontSize: 14,
    marginTop: 2,
  },
  scale: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginBottom: space.xs,
  },
  scaleLabel: {
    fontSize: 12,
  },
  scaleLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  columns: {
    flexDirection: "row",
    gap: space.sm,
  },
  monthColumns: {
    gap: 2,
  },
  column: {
    flex: 1,
    alignItems: "center",
  },
  barArea: {
    height: CHART_HEIGHT,
    width: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderTopLeftRadius: radius.small / 2,
    borderTopRightRadius: radius.small / 2,
  },
  stack: {
    flexDirection: "column-reverse",
    gap: 2,
    overflow: "hidden",
  },
  stub: {
    width: "100%",
    height: 2,
  },
  tick: {
    // Wider than a month's day column, so "22" spills over its neighbours,
    // which have no tick.
    width: 28,
    textAlign: "center",
    fontSize: 12,
    marginTop: space.xs,
    fontVariant: ["tabular-nums"],
  },
});
