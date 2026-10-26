import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { useReduceMotion } from "../../hooks/useReduceMotion";
import type { BudgetPeriod } from "../../budgets/types";
import {
  addDays,
  addMonths,
  longDate,
  monthGrid,
  monthName,
  shortMonthName,
  weekdayInitials,
  type StatsRange,
} from "../../stats/ranges";
import { StepArrow } from "./RangeSelector";

// Like ConfirmDialog: enter slightly slower than exit.
const ENTER_MS = 220;
const EXIT_MS = 150;
const START_SCALE = 0.92;
const CELL_HEIGHT = 44;
const MONTH_CELL_HEIGHT = 56;

const TITLE: Record<BudgetPeriod, string> = {
  day: "Choose a day",
  week: "Choose a week",
  month: "Choose a month",
};

const CURRENT: Record<BudgetPeriod, string> = {
  day: "Today",
  week: "This week",
  month: "This month",
};

// What a calendar date can show: nothing yet (the future, which can't be
// picked), nothing ever (before Roolio counted any app: greyed, but it can
// be picked), or data.
type DateStatus = "future" | "noData" | "data";

// The page the calendar opens on: the month (a year, for months) holding the
// range's last day so far.
function startPage(range: StatsRange, today: string) {
  const last = addDays(range.toDay, -1);
  const shown = last < today ? last : today;
  return range.kind === "month"
    ? `${shown.slice(0, 4)}-01-01`
    : `${shown.slice(0, 7)}-01`;
}

/**
 * A calendar for going straight to any day, week or month up to today. Days
 * before there's anything to see are greyed but can still be picked, like
 * the arrows and swipes reach them. Days and weeks pick from a month of
 * days, where each row is a week; months from a year of months. Picking
 * closes it.
 */
export function RangePicker({
  visible,
  range,
  today,
  firstDay,
  firstDayOfWeek,
  onPick,
  onDismiss,
}: {
  visible: boolean;
  range: StatsRange;
  today: string;
  firstDay: string;
  firstDayOfWeek: number;
  // Gets a day in the picked day, week or month, once the calendar has
  // closed, so the screen changes after it rather than under it.
  onPick: (day: string) => void;
  // Called on back press, scrim tap and Close.
  onDismiss: () => void;
}) {
  const { colors } = useAppTheme();
  const reduceMotion = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));
  // The Modal stays mounted until the exit animation has finished.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  // The month or year shown, as its first day. Each opening starts on the
  // range on screen.
  const [page, setPage] = useState(() => startPage(range, today));
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setPage(startPage(range, today));
  }

  // The day picked while the calendar closes, and the latest `onPick` to
  // hand it to.
  const pending = useRef<string | null>(null);
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    if (!mounted) return;
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 0 : visible ? ENTER_MS : EXIT_MS,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (!finished || visible) return;
      setMounted(false);
      const day = pending.current;
      pending.current = null;
      if (day !== null) onPickRef.current(day);
    });
    return () => animation.stop();
  }, [visible, mounted, reduceMotion, progress]);

  const yearly = range.kind === "month";
  const step = yearly ? 12 : 1;
  const pageLength = yearly ? 4 : 7;
  // Pages are compared by their first `pageLength` characters: "2026" or
  // "2026-10".
  const pageOf = (day: string) => day.slice(0, pageLength);
  const canGoForward = pageOf(page) < pageOf(today);
  const pageLabel = yearly
    ? page.slice(0, 4)
    : `${monthName(page)} ${page.slice(0, 4)}`;

  // A day, or a month from its first to its last day.
  const statusOf = (from: string, to: string = from): DateStatus =>
    from > today ? "future" : to < firstDay ? "noData" : "data";
  const pick = (day: string) => {
    pending.current = day;
    onDismiss();
  };

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [START_SCALE, 1],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Ignore touches while closing so a pick can't fire twice. */}
      <View style={[styles.root, { pointerEvents: visible ? "auto" : "none" }]}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.scrim, opacity: progress },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close calendar"
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.dialog,
            {
              // surfaceContainer keeps `outline` text readable for days
              // that can't be picked.
              backgroundColor: colors.surfaceContainer,
              borderColor: colors.outlineVariant,
              opacity: progress,
              transform: [{ scale }],
            },
          ]}
        >
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors.onSurface }]}
          >
            {TITLE[range.kind]}
          </Text>

          <View style={styles.pager}>
            <StepArrow
              icon="chevron-left"
              label={yearly ? "Previous year" : "Previous month"}
              onPress={() => setPage(addMonths(page, -step))}
              size={24}
            />
            <Text
              style={[styles.pageLabel, { color: colors.onSurface }]}
              accessibilityLiveRegion="polite"
            >
              {pageLabel}
            </Text>
            <StepArrow
              icon="chevron-right"
              label={yearly ? "Next year" : "Next month"}
              onPress={() => setPage(addMonths(page, step))}
              disabled={!canGoForward}
              size={24}
            />
          </View>

          {yearly ? (
            <MonthGrid
              year={page}
              range={range}
              today={today}
              statusOf={(month) =>
                statusOf(month, addDays(addMonths(month, 1), -1))
              }
              onPick={pick}
            />
          ) : (
            <DayGrid
              month={page}
              range={range}
              today={today}
              firstDayOfWeek={firstDayOfWeek}
              statusOf={statusOf}
              onPick={pick}
            />
          )}

          <View style={styles.actions}>
            <DialogButton
              label={CURRENT[range.kind]}
              onPress={() => pick(today)}
            />
            <DialogButton label="Close" onPress={onDismiss} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// A month of days under weekday initials. A picked day is filled; a picked
// week is a band across its row.
function DayGrid({
  month,
  range,
  today,
  firstDayOfWeek,
  statusOf,
  onPick,
}: {
  month: string;
  range: StatsRange;
  today: string;
  firstDayOfWeek: number;
  statusOf: (day: string) => DateStatus;
  onPick: (day: string) => void;
}) {
  const { colors } = useAppTheme();
  const weekly = range.kind === "week";
  const inRange = (day: string) => day >= range.fromDay && day < range.toDay;

  return (
    <View>
      <View
        style={styles.row}
        importantForAccessibility="no-hide-descendants"
      >
        {weekdayInitials(firstDayOfWeek).map((weekday) => (
          <Text
            key={weekday.name}
            style={[styles.weekday, { color: colors.onSurfaceVariant }]}
            maxFontSizeMultiplier={1.5}
          >
            {weekday.initial}
          </Text>
        ))}
      </View>

      {monthGrid(month, firstDayOfWeek).map((week) => {
        const weekPicked =
          weekly && week.some((day) => day !== null && inRange(day));
        return (
          <View
            key={week.find((day) => day !== null)}
            style={[
              styles.row,
              weekPicked && [
                styles.band,
                { backgroundColor: colors.primaryContainer },
              ],
            ]}
          >
            {week.map((day, column) => {
              if (day === null) {
                return <View key={column} style={styles.cell} />;
              }
              const status = statusOf(day);
              const picked = !weekly && inRange(day);
              const isToday = day === today;
              return (
                <Pressable
                  key={day}
                  onPress={() => onPick(day)}
                  disabled={status === "future"}
                  accessibilityRole="button"
                  accessibilityLabel={dateLabel(
                    longDate(day),
                    status,
                    isToday ? "today" : null,
                  )}
                  accessibilityState={{
                    selected: picked || weekPicked,
                    disabled: status === "future",
                  }}
                  style={styles.cell}
                >
                  {({ pressed }) => (
                    <View
                      style={[
                        styles.dayMark,
                        picked && { backgroundColor: colors.primary },
                        // Pressing shows on the day's circle, not the cell.
                        pressed &&
                          !picked && {
                            backgroundColor: colors.surfaceContainerHighest,
                          },
                        isToday &&
                          !picked && [
                            styles.todayRing,
                            { borderColor: colors.primary },
                          ],
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          {
                            color: picked
                              ? colors.onPrimary
                              : weekPicked
                                ? colors.onPrimaryContainer
                                : status === "data"
                                  ? colors.onSurface
                                  : colors.outline,
                            fontWeight: picked || isToday ? "700" : "400",
                          },
                        ]}
                        maxFontSizeMultiplier={1.5}
                      >
                        {Number(day.slice(8))}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

// A year of months, three to a row.
function MonthGrid({
  year,
  range,
  today,
  statusOf,
  onPick,
}: {
  year: string;
  range: StatsRange;
  today: string;
  statusOf: (month: string) => DateStatus;
  onPick: (month: string) => void;
}) {
  const { colors } = useAppTheme();
  const months = Array.from({ length: 12 }, (_, index) =>
    addMonths(year, index),
  );
  const rows = [0, 3, 6, 9].map((first) => months.slice(first, first + 3));

  return (
    <View>
      {rows.map((row) => (
        <View key={row[0]} style={styles.row}>
          {row.map((month) => {
            const status = statusOf(month);
            const picked = month === range.fromDay;
            const current = month.slice(0, 7) === today.slice(0, 7);
            const name = `${monthName(month)} ${month.slice(0, 4)}`;
            return (
              <Pressable
                key={month}
                onPress={() => onPick(month)}
                disabled={status === "future"}
                accessibilityRole="button"
                accessibilityLabel={dateLabel(
                  name,
                  status,
                  current ? "this month" : null,
                )}
                accessibilityState={{
                  selected: picked,
                  disabled: status === "future",
                }}
                style={styles.monthCell}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.monthMark,
                      picked && { backgroundColor: colors.primary },
                      pressed &&
                        !picked && {
                          backgroundColor: colors.surfaceContainerHighest,
                        },
                      current &&
                        !picked && [
                          styles.todayRing,
                          { borderColor: colors.primary },
                        ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.monthLabel,
                        {
                          color: picked
                            ? colors.onPrimary
                            : status === "data"
                              ? colors.onSurface
                              : colors.outline,
                          fontWeight: picked || current ? "700" : "400",
                        },
                      ]}
                      maxFontSizeMultiplier={1.5}
                    >
                      {shortMonthName(month)}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// "Monday, October 20, 2026, today", with "no data" for a greyed date.
function dateLabel(name: string, status: DateStatus, now: string | null) {
  return [name, now, status === "noData" ? "no data" : null]
    .filter(Boolean)
    .join(", ");
}

function DialogButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  // A rounded wrapper clips the Android ripple to the pill shape.
  return (
    <View style={styles.actionClip}>
      <Pressable
        onPress={onPress}
        android_ripple={{ color: colors.surfaceContainerHighest }}
        accessibilityRole="button"
        style={styles.action}
      >
        <Text style={[styles.actionLabel, { color: colors.primary }]}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.lg,
  },
  dialog: {
    width: "100%",
    maxWidth: 400,
    borderRadius: radius.extraLarge,
    borderWidth: 1,
    paddingTop: space.xl,
    paddingHorizontal: space.md,
    paddingBottom: space.md,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginHorizontal: space.md,
  },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: space.sm,
  },
  pageLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
  },
  band: {
    borderRadius: radius.full,
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    paddingVertical: space.xs,
  },
  cell: {
    flex: 1,
    height: CELL_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  dayMark: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  todayRing: {
    borderWidth: 1,
  },
  dayNumber: {
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
  monthCell: {
    flex: 1,
    height: MONTH_CELL_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  monthMark: {
    minWidth: 72,
    height: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  monthLabel: {
    fontSize: 15,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: space.md,
  },
  actionClip: {
    borderRadius: radius.full,
    overflow: "hidden",
  },
  action: {
    minHeight: 48,
    paddingHorizontal: space.md,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
});
