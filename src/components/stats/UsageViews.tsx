import { useRef, useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { useReduceMotion } from "../../hooks/useReduceMotion";
import type { Stats } from "../../stats/summary";
import {
  getScreenMemory,
  rememberStatsChart,
  type StatsChartView,
} from "../../../modules/roolio-core";
import { AppRing } from "./AppRing";
import { DailyChart } from "./DailyChart";

const VIEWS: readonly { key: StatsChartView; title: string }[] = [
  { key: "ring", title: "Share of time" },
  { key: "stacked", title: "Each day by app" },
  { key: "daily", title: "Each day" },
];

// The view the user last picked, or the ring.
function savedView() {
  const saved = getScreenMemory().statsChart;
  return Math.max(0, VIEWS.findIndex((view) => view.key === saved));
}

// The range's time used, drawn three ways: each app's share as a ring, each
// day split by app, and each day in one color. Swipe or use the arrows to
// change. The view stays when the range changes, and Stats reopens on it.
export function UsageViews({
  stats,
  rangeLabel,
  onSelectDay,
}: {
  stats: Stats;
  rangeLabel: string;
  onSelectDay: (day: string) => void;
}) {
  const { colors } = useAppTheme();
  const reduceMotion = useReduceMotion();
  const pagerRef = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [index, setIndex] = useState(savedView);

  const show = (next: number) => {
    setIndex(next);
    rememberStatsChart(VIEWS[next].key);
  };

  const goTo = (next: number) => {
    show(next);
    pagerRef.current?.scrollTo({ x: next * pageWidth, animated: !reduceMotion });
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width === pageWidth) return;
    setPageWidth(width);
    // Keep the same view in place after a resize.
    pagerRef.current?.scrollTo({ x: index * width, animated: false });
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth === 0) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
    if (next !== index) show(next);
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
      <View style={styles.header}>
        <Arrow
          icon="chevron-left"
          label="Previous chart"
          disabled={index === 0}
          onPress={() => goTo(index - 1)}
        />
        <View style={styles.titleBlock}>
          <Text
            style={[styles.title, { color: colors.onSurface }]}
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
            numberOfLines={1}
          >
            {VIEWS[index].title}
          </Text>
          <View
            style={styles.dots}
            importantForAccessibility="no-hide-descendants"
          >
            {VIEWS.map((view, dot) => (
              <View
                key={view.key}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      dot === index ? colors.primary : colors.outlineVariant,
                  },
                ]}
              />
            ))}
          </View>
        </View>
        <Arrow
          icon="chevron-right"
          label="Next chart"
          disabled={index === VIEWS.length - 1}
          onPress={() => goTo(index + 1)}
        />
      </View>

      <View onLayout={handleLayout}>
        {pageWidth > 0 && (
          <ScrollView
            ref={pagerRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScrollEnd}
            contentOffset={{ x: index * pageWidth, y: 0 }}
          >
            <Page width={pageWidth} active={index === 0}>
              <AppRing stats={stats} rangeLabel={rangeLabel} />
            </Page>
            <Page width={pageWidth} active={index === 1}>
              <DailyChart stats={stats} onSelectDay={onSelectDay} stacked />
            </Page>
            <Page width={pageWidth} active={index === 2}>
              <DailyChart stats={stats} onSelectDay={onSelectDay} />
            </Page>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

// One view of the pager. Views out of sight are hidden from screen readers,
// which change views with the arrows.
function Page({
  width,
  active,
  children,
}: {
  width: number;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <View
      style={[styles.page, { width }]}
      importantForAccessibility={active ? "auto" : "no-hide-descendants"}
      accessibilityElementsHidden={!active}
    >
      {children}
    </View>
  );
}

function Arrow({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  disabled: boolean;
  onPress: () => void;
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
          size={24}
          color={disabled ? colors.outlineVariant : colors.onSurface}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.large,
    borderWidth: 1,
    paddingVertical: space.md,
    // Pages reach the card's edges so a swipe moves them in from outside it,
    // and pad themselves.
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.xs,
    marginBottom: space.md,
  },
  titleBlock: {
    flex: 1,
    alignItems: "center",
    gap: space.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  dots: {
    flexDirection: "row",
    gap: space.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
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
  page: {
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
});
