import type { ReactNode } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { FREE_APP_LIMIT, type PremiumFeature } from "../../premium/plan";

const FREE_COLUMN = 48;
const PREMIUM_COLUMN = 88;
// Every row is the same height, whether its label takes one line or two.
const ROW_HEIGHT = 56;
const ICON = 20;
const MARK = 22;

// What each plan has: a value to show, or whether it's included.
type Cell = string | boolean;

// What both plans have first, then what only Premium has.
const ROWS: {
  key: string;
  feature?: PremiumFeature;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  free: Cell;
  premium: Cell;
}[] = [
  {
    key: "daily",
    icon: "today",
    label: "Daily budgets",
    free: true,
    premium: true,
  },
  {
    key: "bank",
    icon: "savings",
    label: "Banking and borrowing",
    free: true,
    premium: true,
  },
  {
    key: "apps",
    feature: "apps",
    icon: "apps",
    label: "Apps with a budget",
    free: String(FREE_APP_LIMIT),
    premium: "Unlimited",
  },
  {
    key: "periods",
    feature: "periods",
    icon: "date-range",
    label: "Weekly and monthly budgets",
    free: false,
    premium: true,
  },
  {
    key: "stats",
    feature: "stats",
    icon: "insights",
    label: "Stats",
    free: false,
    premium: true,
  },
];

function describe(cell: Cell) {
  if (typeof cell === "string") return cell;
  return cell ? "included" : "not included";
}

type PlanComparisonProps = {
  // The feature whose lock was tapped, shown in bold.
  highlight?: PremiumFeature;
  // Animates each row in, 0 to 1 as the screen first appears.
  appear: Animated.Value;
};

// Free and Premium side by side. Premium's column carries the color; Free's
// stays quiet, so what Premium adds stands out.
export function PlanComparison({ highlight, appear }: PlanComparisonProps) {
  const { colors } = useAppTheme();

  const renderCell = (cell: Cell, premium: boolean) => {
    if (typeof cell === "string") {
      return (
        <Text
          style={[
            styles.value,
            premium
              ? { color: colors.onPrimaryContainer, fontWeight: "800" }
              : { color: colors.onSurfaceVariant, fontWeight: "600" },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {cell}
        </Text>
      );
    }
    if (!cell) {
      return <MaterialIcons name="close" size={MARK} color={colors.outline} />;
    }
    return (
      <MaterialIcons
        name="check"
        size={MARK}
        color={premium ? colors.primary : colors.outline}
      />
    );
  };

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
      {/* Premium's column, drawn behind every row. */}
      <View
        style={[
          styles.premiumBand,
          { backgroundColor: colors.primaryContainer },
        ]}
      />

      <View
        style={styles.headingRow}
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.label} />
        <Text
          style={[
            styles.heading,
            styles.freeColumn,
            { color: colors.onSurfaceVariant },
          ]}
        >
          Free
        </Text>
        <Text
          style={[
            styles.heading,
            styles.premiumColumn,
            { color: colors.onPrimaryContainer, fontWeight: "800" },
          ]}
        >
          Premium
        </Text>
      </View>

      {ROWS.map((row, index) => {
        const highlighted =
          row.feature !== undefined && row.feature === highlight;
        return (
          <AnimatedRow
            key={row.key}
            appear={appear}
            start={0.3 + index * 0.1}
            accessibilityLabel={`${row.label}: Free, ${describe(row.free)}. Premium, ${describe(row.premium)}.`}
          >
            <View
              style={[
                styles.divider,
                { backgroundColor: colors.outlineVariant },
              ]}
            />
            <View style={[styles.label, styles.labelCell]}>
              <MaterialIcons
                name={row.icon}
                size={ICON}
                color={highlighted ? colors.primary : colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.labelText,
                  {
                    color: colors.onSurface,
                    fontWeight: highlighted ? "700" : "400",
                  },
                ]}
              >
                {row.label}
              </Text>
            </View>
            <View style={styles.freeColumn}>{renderCell(row.free, false)}</View>
            <View style={styles.premiumColumn}>
              {renderCell(row.premium, true)}
            </View>
          </AnimatedRow>
        );
      })}
    </View>
  );
}

// A row that fades and rises in from `start` of the screen appearing.
function AnimatedRow({
  appear,
  start,
  accessibilityLabel,
  children,
}: {
  appear: Animated.Value;
  start: number;
  accessibilityLabel: string;
  children: ReactNode;
}) {
  const end = Math.min(start + 0.3, 1);
  return (
    <Animated.View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.row,
        {
          opacity: appear.interpolate({
            inputRange: [start, end],
            outputRange: [0, 1],
            extrapolate: "clamp",
          }),
          transform: [
            {
              translateY: appear.interpolate({
                inputRange: [start, end],
                outputRange: [12, 0],
                extrapolate: "clamp",
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.large,
    borderWidth: 1,
    paddingBottom: space.xs,
    paddingLeft: space.lg,
    paddingRight: space.xs,
  },
  premiumBand: {
    position: "absolute",
    top: space.xs,
    bottom: space.xs,
    right: space.xs,
    width: PREMIUM_COLUMN,
    borderRadius: radius.medium,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    paddingTop: space.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: ROW_HEIGHT,
  },
  // A line above each row, stopping at Premium's column.
  divider: {
    position: "absolute",
    top: 0,
    left: 0,
    right: PREMIUM_COLUMN,
    height: StyleSheet.hairlineWidth,
  },
  label: {
    flex: 1,
  },
  labelCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.sm,
    paddingRight: space.sm,
  },
  labelText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  freeColumn: {
    width: FREE_COLUMN,
    alignItems: "center",
    textAlign: "center",
  },
  premiumColumn: {
    width: PREMIUM_COLUMN,
    alignItems: "center",
    textAlign: "center",
    paddingHorizontal: space.sm,
  },
  heading: {
    fontSize: 13,
    fontWeight: "600",
  },
  value: {
    fontSize: 15,
    textAlign: "center",
  },
});
