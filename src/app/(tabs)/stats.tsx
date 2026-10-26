import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAppTheme } from "../../theme/ThemeProvider";
import { space } from "../../theme/tokens";
import type { BudgetPeriod } from "../../budgets/types";
import { useStats } from "../../hooks/stats/useStats";
import { useReduceMotion } from "../../hooks/useReduceMotion";
import { rangeLabel, stepsBackTo } from "../../stats/ranges";
import {
  getScreenMemory,
  rememberStatsRange,
} from "../../../modules/roolio-core";
import {
  RangeSelector,
  RangeStepper,
} from "../../components/stats/RangeSelector";
import { TimeBankStatement } from "../../components/stats/TimeBankStatement";
import { UsageViews } from "../../components/stats/UsageViews";
import { AppBreakdown } from "../../components/stats/AppBreakdown";
import { BankBorrowBalance } from "../../components/stats/BankBorrowBalance";
import { ShareButton } from "../../components/stats/ShareButton";
import { RangePicker } from "../../components/stats/RangePicker";
import { NoData } from "../../components/stats/NoData";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { TextButton } from "../../components/ui/TextButton";

// A swipe changes the range once it's pulled this share of the screen's
// width, or flung faster than FLING (px per ms).
const SWIPE_SHARE = 0.25;
const FLING = 0.5;
// How far a move has to go sideways, and how much more sideways than up or
// down, before it's a swipe rather than a scroll or a tap.
const SWIPE_SLOP = 24;
// At the current range there's nothing newer: the content only gives a little.
const RESISTANCE = 0.2;
const SLIDE_OUT_MS = 150;
const SLIDE_IN_MS = 220;
// Slides the new range in even if it hasn't loaded by then.
const SLIDE_IN_WAIT_MS = 500;

export default function StatsScreen() {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  // Day, Week or Month as the user last left it. The range itself always
  // starts at the current one.
  const [kind, setKind] = useState<BudgetPeriod>(
    () => getScreenMemory().statsRange ?? "week",
  );
  // 0 is the current day, week or month; 1 the one before.
  const [stepsBack, setStepsBack] = useState(0);
  const [picking, setPicking] = useState(false);
  const { stats, status, reload } = useStats(kind, stepsBack);
  // Everything under the range controls, which Share turns into one image.
  const shareRef = useRef<View>(null);
  // How far the content under the range controls is pulled sideways.
  const [slide] = useState(() => new Animated.Value(0));
  // After a swipe, the side the next range slides in from: 1 is the right.
  const enterFrom = useRef(0);
  const enterTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleKind = useCallback((next: BudgetPeriod) => {
    setKind(next);
    setStepsBack(0);
    rememberStatsRange(next);
  }, []);

  const slideIn = useCallback(() => {
    clearTimeout(enterTimer.current);
    const from = enterFrom.current;
    if (from === 0) return;
    enterFrom.current = 0;
    slide.setValue(from * width);
    Animated.timing(slide, {
      toValue: 0,
      duration: SLIDE_IN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [slide, width]);

  // The swiped-to range is on screen: bring it in.
  const shownRange = stats
    ? `${stats.range.kind} ${stats.range.fromDay}`
    : "";
  useEffect(() => {
    slideIn();
  }, [shownRange, slideIn]);
  useEffect(() => {
    const timer = enterTimer;
    return () => clearTimeout(timer.current);
  }, []);

  // Where the touch under way started, and how fast it last moved sideways
  // (px per ms), for telling a swipe from a scroll or a tap.
  const touch = useRef({ x: 0, y: 0, lastX: 0, lastTime: 0, velocity: 0 });

  // Fades as it slides, so a range leaves and arrives softly.
  const slideStyle = useMemo(
    () => ({
      opacity: slide.interpolate({
        inputRange: [-width, 0, width],
        outputRange: [0, 1, 0],
      }),
      transform: [{ translateX: slide }],
    }),
    [slide, width],
  );

  // Back for a swipe to the right, like the left arrow; forward for one to
  // the left, but never past the current range.
  const allowed = (dx: number) => dx > 0 || stepsBack > 0;
  const settle = () =>
    Animated.spring(slide, { toValue: 0, useNativeDriver: true }).start();

  // Goes to another range after a swipe or a pick from the calendar: the
  // content slides out on the side of the range's place in time, and the
  // new one slides in from the other side once it has loaded. Older ranges
  // are to the left, like the arrows.
  const moveTo = (next: number) => {
    if (next === stepsBack) {
      settle();
      return;
    }
    if (reduceMotion) {
      slide.setValue(0);
      setStepsBack(next);
      return;
    }
    const direction = next > stepsBack ? 1 : -1;
    Animated.timing(slide, {
      toValue: direction * width,
      duration: SLIDE_OUT_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      enterFrom.current = -direction;
      setStepsBack(next);
      enterTimer.current = setTimeout(slideIn, SLIDE_IN_WAIT_MS);
    });
  };

  const handleTouchStart = (event: GestureResponderEvent) => {
    const { pageX, pageY, timestamp } = event.nativeEvent;
    touch.current = {
      x: pageX,
      y: pageY,
      lastX: pageX,
      lastTime: timestamp,
      velocity: 0,
    };
  };

  // Only a mostly sideways move, so scrolling and taps work as before. The
  // chart card's own pager takes swipes inside it first.
  const handleMoveShouldSwipe = (event: GestureResponderEvent) => {
    const dx = event.nativeEvent.pageX - touch.current.x;
    const dy = event.nativeEvent.pageY - touch.current.y;
    return Math.abs(dx) > SWIPE_SLOP && Math.abs(dx) > 2 * Math.abs(dy);
  };

  const handleSwipeMove = (event: GestureResponderEvent) => {
    const { pageX, timestamp } = event.nativeEvent;
    const current = touch.current;
    if (timestamp > current.lastTime) {
      current.velocity =
        (pageX - current.lastX) / (timestamp - current.lastTime);
    }
    current.lastX = pageX;
    current.lastTime = timestamp;
    if (reduceMotion) return;
    const dx = pageX - current.x;
    slide.setValue(allowed(dx) ? dx : dx * RESISTANCE);
  };

  const handleSwipeEnd = (event: GestureResponderEvent) => {
    const dx = event.nativeEvent.pageX - touch.current.x;
    const vx = touch.current.velocity;
    const far = Math.abs(dx) > width * SWIPE_SHARE;
    const flung = Math.abs(vx) > FLING && Math.sign(vx) === Math.sign(dx);
    if (!allowed(dx) || !(far || flung)) {
      settle();
      return;
    }
    moveTo(Math.max(0, stepsBack + Math.sign(dx)));
  };

  const handleOpenApp = useCallback((packageName: string) => {
    router.push({ pathname: "/budget/[packageName]", params: { packageName } });
  }, []);

  const handleSelectDay = useCallback(
    (day: string) => {
      if (stats) {
        setStepsBack(
          stepsBackTo("day", day, stats.today, stats.firstDayOfWeek),
        );
      }
    },
    [stats],
  );

  const handlePick = (day: string) => {
    if (stats) {
      moveTo(stepsBackTo(kind, day, stats.today, stats.firstDayOfWeek));
    }
  };

  const hasBankOrBorrow =
    stats?.apps.some(
      (app) => app.bankedMinutes > 0 || app.borrowedMinutes > 0,
    ) ?? false;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {status === "loading" && !stats && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {status === "error" && !stats && (
        <View style={styles.centered}>
          <MaterialIcons
            name="error-outline"
            size={48}
            color={colors.onSurfaceVariant}
          />
          <Text style={[styles.headline, { color: colors.onSurface }]}>
            Couldn&apos;t load your stats
          </Text>
          <TextButton label="Try again" onPress={reload} />
        </View>
      )}

      {stats && stats.apps.length === 0 && (
        <View style={styles.centered}>
          <MaterialIcons name="insights" size={64} color={colors.primary} />
          <Text style={[styles.headline, { color: colors.onSurface }]}>
            No stats yet
          </Text>
          <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
            Add an app to see its time here, with what you bank and borrow.
          </Text>
          <View style={styles.emptyAction}>
            <PrimaryButton
              label="Add an app"
              onPress={() => router.push("/add-app")}
            />
          </View>
        </View>
      )}

      {stats && stats.apps.length > 0 && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* A swipe anywhere here goes to the previous or next range. */}
          <View
            style={styles.swipeArea}
            onTouchStart={handleTouchStart}
            onMoveShouldSetResponder={handleMoveShouldSwipe}
            onResponderTerminationRequest={() => false}
            onResponderMove={handleSwipeMove}
            onResponderRelease={handleSwipeEnd}
            onResponderTerminate={settle}
          >
            <View style={styles.titleRow}>
              <Text
                style={[styles.title, { color: colors.onSurface }]}
                accessibilityRole="header"
              >
                Stats
              </Text>
              {stats.hasData && <ShareButton target={shareRef} />}
            </View>

            <RangeSelector kind={kind} onChange={handleKind} />
            <RangeStepper
              kind={kind}
              label={rangeLabel(stats.range, stats.today)}
              canGoForward={stepsBack > 0}
              // Straight away, without a slide, so quick taps all count.
              onBack={() => setStepsBack((steps) => steps + 1)}
              onForward={() =>
                setStepsBack((steps) => Math.max(0, steps - 1))
              }
              onPick={() => setPicking(true)}
            />

            <Animated.View style={slideStyle}>
              {/* The shared image: a solid background with a margin, so it
                  reads on its own outside the app. Before Roolio counted
                  anything, a note says where stats start instead. */}
              {stats.hasData ? (
                <View
                  ref={shareRef}
                  collapsable={false}
                  style={[
                    styles.sections,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <TimeBankStatement
                    stats={stats}
                    rangeLabel={rangeLabel(stats.range, stats.today)}
                  />

                  <UsageViews
                    stats={stats}
                    rangeLabel={rangeLabel(stats.range, stats.today)}
                    onSelectDay={handleSelectDay}
                  />

                  <Section title="Apps">
                    <AppBreakdown
                      apps={stats.apps}
                      onOpenApp={handleOpenApp}
                    />
                  </Section>

                  {hasBankOrBorrow && (
                    <Section title="Banked and borrowed">
                      <BankBorrowBalance apps={stats.apps} />
                    </Section>
                  )}
                </View>
              ) : (
                <View style={styles.noData}>
                  <NoData
                    kind={stats.range.kind}
                    rangeLabel={rangeLabel(stats.range, stats.today)}
                    trackedFrom={stats.trackedFrom}
                    today={stats.today}
                    onGoToStart={() => handlePick(stats.trackedFrom)}
                  />
                </View>
              )}
            </Animated.View>
          </View>
        </ScrollView>
      )}

      {stats && (
        <RangePicker
          visible={picking}
          range={stats.range}
          today={stats.today}
          firstDay={stats.firstDay}
          firstDayOfWeek={stats.firstDayOfWeek}
          onPick={handlePick}
          onDismiss={() => setPicking(false)}
        />
      )}
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { colors } = useAppTheme();
  return (
    <View>
      <Text
        style={[styles.sectionTitle, { color: colors.onSurface }]}
        accessibilityRole="header"
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
  },
  // Fills the screen, so a swipe works below short content too.
  swipeArea: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  sections: {
    gap: space.xl,
    marginTop: space.sm,
    // Reaches the screen's edges, so the image has a margin all round.
    marginHorizontal: -space.lg,
    padding: space.lg,
  },
  noData: {
    marginTop: space.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: space.md,
    marginLeft: space.xs,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxl,
    gap: space.md,
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
  emptyAction: {
    alignSelf: "stretch",
    marginTop: space.md,
  },
});
