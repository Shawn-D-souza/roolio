import { useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { formatDuration } from "../../budgets/format";
import type { BudgetPeriod } from "../../budgets/types";
import type { Stats } from "../../stats/summary";
import { AppIcon } from "../addApp/AppIcon";

// The torn edge at the bottom of the statement.
const TOOTH_WIDTH = 14;
const TOOTH_DEPTH = 7;
const CORNER = radius.large;
const ICON_SIZE = 22;
const MAX_ICONS = 5;

// The outline of the statement: rounded at the top, torn at the bottom.
function statementPath(width: number, height: number) {
  const bottom = height - TOOTH_DEPTH;
  const teeth = Math.max(1, Math.round(width / TOOTH_WIDTH));
  const tooth = width / teeth;
  let path = `M ${CORNER} 0 H ${width - CORNER} Q ${width} 0 ${width} ${CORNER} V ${bottom}`;
  for (let index = teeth; index > 0; index--) {
    const right = index * tooth;
    path += ` L ${right - tooth / 2} ${height} L ${right - tooth} ${bottom}`;
  }
  return `${path} V ${CORNER} Q 0 0 ${CORNER} 0 Z`;
}

// Why some budgets' banked and borrowed time isn't in this range.
function longerPeriodsNote(periods: BudgetPeriod[]) {
  const weekly = periods.includes("week");
  const monthly = periods.includes("month");
  if (weekly && monthly) {
    return "Weekly budgets show their banked and borrowed time in Week and Month, and monthly budgets in Month.";
  }
  if (weekly) {
    return "Weekly budgets show their banked and borrowed time in Week and Month.";
  }
  if (monthly) {
    return "Monthly budgets show their banked and borrowed time in Month.";
  }
  return null;
}

// The range as a bank statement: what was banked, borrowed and paid back in
// it, with the time used as the total. Every line is about the range shown,
// never about right now.
export function TimeBankStatement({
  stats,
  rangeLabel,
}: {
  stats: Stats;
  rangeLabel: string;
}) {
  const { colors } = useAppTheme();
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const ink = colors.onPrimaryContainer;
  const usedApps = stats.apps.filter((app) => app.usedMinutes > 0);
  const note = longerPeriodsNote(stats.longerPeriods);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      current?.width === width && current.height === height
        ? current
        : { width, height },
    );
  };

  return (
    <View>
      <View style={styles.statement} onLayout={handleLayout}>
        {size && (
          <Svg
            width={size.width}
            height={size.height}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            {/* Inset by half the stroke, so the outline isn't clipped. */}
            <Path
              d={statementPath(size.width - 1, size.height - 1)}
              transform="translate(0.5, 0.5)"
              fill={colors.primaryContainer}
              stroke={colors.outline}
              strokeWidth={1}
            />
          </Svg>
        )}

        <View style={styles.titleRow}>
          <Text
            style={[styles.brand, { color: ink }]}
            accessibilityRole="header"
          >
            ROOLIO · TIME BANK
          </Text>
          <View style={styles.icons}>
            {usedApps.slice(0, MAX_ICONS).map((app, index) => (
              <View
                key={app.packageName}
                style={[
                  styles.iconRing,
                  index > 0 && styles.iconOverlap,
                  { borderColor: colors.primaryContainer },
                ]}
              >
                <AppIcon
                  packageName={app.packageName}
                  appName={app.appName}
                  updatedAt={app.iconVersion}
                  size={ICON_SIZE}
                />
              </View>
            ))}
          </View>
        </View>
        <Text style={[styles.range, { color: ink }]}>{rangeLabel}</Text>
        <Text style={[styles.subtitle, { color: ink }]}>
          {usedApps.length === 0
            ? "No time used"
            : usedApps.length === 1
              ? "1 app used"
              : `${usedApps.length} apps used`}
        </Text>

        <DashedRule color={ink} />

        <StatementLine
          label="Banked"
          value={
            stats.bankedMinutes > 0
              ? `+${formatDuration(stats.bankedMinutes)}`
              : formatDuration(0)
          }
          dot={colors.banked}
        />
        <StatementLine
          label="Borrowed"
          value={formatDuration(stats.borrowedMinutes)}
          dot={colors.borrowed}
        />
        <StatementLine
          label="Paid back"
          value={formatDuration(stats.repaidMinutes)}
        />

        <DashedRule color={ink} />

        <StatementLine
          label="Time used"
          value={formatDuration(stats.usedMinutes)}
          strong
        />
      </View>

      {note && (
        <Text style={[styles.note, { color: colors.onSurfaceVariant }]}>
          {note}
        </Text>
      )}
    </View>
  );
}

function StatementLine({
  label,
  value,
  dot,
  strong = false,
}: {
  label: string;
  value: string;
  // The color this amount has elsewhere, e.g. green for banked. The label
  // says the same, so color is never the only signal.
  dot?: string;
  strong?: boolean;
}) {
  const { colors } = useAppTheme();
  const ink = colors.onPrimaryContainer;
  const weight = strong ? "700" : "400";

  return (
    <View
      style={styles.line}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={styles.lineLabel}>
        {dot && <View style={[styles.dot, { backgroundColor: dot }]} />}
        <Text
          style={[
            styles.lineText,
            { color: ink, fontWeight: weight },
            strong && styles.strongText,
          ]}
        >
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.lineText,
          styles.amount,
          { color: ink, fontWeight: strong ? "700" : "600" },
          strong && styles.strongText,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// A dashed line across the statement, like a receipt's.
function DashedRule({ color }: { color: string }) {
  return (
    <View style={styles.rule} importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height={2}>
        <Line
          x1="0"
          y1="1"
          x2="100%"
          y2="1"
          stroke={color}
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.5}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  statement: {
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    // Clear of the torn edge.
    paddingBottom: space.xl + TOOTH_DEPTH,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  brand: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  icons: {
    flexDirection: "row",
  },
  iconRing: {
    borderWidth: 2,
    borderRadius: radius.small,
  },
  iconOverlap: {
    marginLeft: -space.sm,
  },
  range: {
    fontSize: 26,
    fontWeight: "700",
    marginTop: space.md,
  },
  subtitle: {
    fontSize: 14,
    marginTop: space.xs,
    opacity: 0.8,
  },
  rule: {
    marginVertical: space.lg,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.xs,
    gap: space.md,
  },
  lineLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    flexShrink: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  lineText: {
    fontSize: 16,
  },
  amount: {
    fontVariant: ["tabular-nums"],
  },
  strongText: {
    fontSize: 18,
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: space.xs,
    marginHorizontal: space.xs,
  },
});
