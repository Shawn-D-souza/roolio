import type { BudgetPeriod } from "../budgets/types";

// A stretch of local days, `toDay` exclusive. Days are "YYYY-MM-DD", like the
// native day keys, so they compare in date order as strings.
export type StatsRange = {
  kind: BudgetPeriod;
  fromDay: string;
  toDay: string;
};

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const PERIOD_LENGTH: Record<BudgetPeriod, number> = {
  day: 0,
  week: 1,
  month: 2,
};

// Whether a period of `period` fits inside a range of `kind`: days fit in
// weeks and months, weeks in months.
export function fitsIn(period: BudgetPeriod, kind: BudgetPeriod) {
  return PERIOD_LENGTH[period] <= PERIOD_LENGTH[kind];
}

export function dayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// Local midnight of a day key.
export function parseDay(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
}

export function addDays(day: string, count: number) {
  const date = parseDay(day);
  date.setDate(date.getDate() + count);
  return dayKey(date);
}

export function addMonths(day: string, count: number) {
  const date = parseDay(day);
  return dayKey(new Date(date.getFullYear(), date.getMonth() + count, 1));
}

// `firstDayOfWeek` is a java.util.Calendar day: 1 is Sunday, 2 Monday.
export function weekStart(day: string, firstDayOfWeek: number) {
  const offset = (parseDay(day).getDay() - (firstDayOfWeek - 1) + 7) % 7;
  return addDays(day, -offset);
}

function rangeOf(kind: BudgetPeriod, day: string, firstDayOfWeek: number) {
  switch (kind) {
    case "day":
      return { kind, fromDay: day, toDay: addDays(day, 1) };
    case "week": {
      const fromDay = weekStart(day, firstDayOfWeek);
      return { kind, fromDay, toDay: addDays(fromDay, 7) };
    }
    case "month": {
      const fromDay = `${day.slice(0, 7)}-01`;
      return { kind, fromDay, toDay: addMonths(fromDay, 1) };
    }
  }
}

// The first day of the day, week or month holding `day`.
export function periodStart(
  kind: BudgetPeriod,
  day: string,
  firstDayOfWeek: number,
) {
  return rangeOf(kind, day, firstDayOfWeek).fromDay;
}

// The range `stepsBack` days, weeks or months before the one holding `today`.
export function rangeFor(
  kind: BudgetPeriod,
  stepsBack: number,
  firstDayOfWeek: number,
  today: string,
): StatsRange {
  switch (kind) {
    case "day":
      return rangeOf(kind, addDays(today, -stepsBack), firstDayOfWeek);
    case "week":
      return rangeOf(kind, addDays(today, -7 * stepsBack), firstDayOfWeek);
    case "month":
      return rangeOf(kind, addMonths(today, -stepsBack), firstDayOfWeek);
  }
}

// How many days, weeks or months the one holding `day` is before the one
// holding `today`: the `stepsBack` that shows `day`.
export function stepsBackTo(
  kind: BudgetPeriod,
  day: string,
  today: string,
  firstDayOfWeek: number,
) {
  switch (kind) {
    case "day":
      return daysBefore(day, today);
    case "week":
      return Math.round(
        daysBefore(
          weekStart(day, firstDayOfWeek),
          weekStart(today, firstDayOfWeek),
        ) / 7,
      );
    case "month": {
      const months = (key: string) =>
        Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7));
      return months(today) - months(day);
    }
  }
}

// The days the chart shows: a day is shown within its week.
export function chartRange(
  range: StatsRange,
  firstDayOfWeek: number,
): StatsRange {
  return range.kind === "day"
    ? rangeOf("week", range.fromDay, firstDayOfWeek)
    : range;
}

// How many days `day` is before `today`.
export function daysBefore(day: string, today: string) {
  return Math.round(
    (parseDay(today).getTime() - parseDay(day).getTime()) / 86_400_000,
  );
}

export function daysIn(range: StatsRange) {
  const days: string[] = [];
  for (let day = range.fromDay; day < range.toDay; day = addDays(day, 1)) {
    days.push(day);
  }
  return days;
}

// "Mon", "Tue".
export function weekdayLabel(day: string) {
  return WEEKDAYS[parseDay(day).getDay()];
}

// "Monday, October 20, 2026", for screen readers.
export function longDate(day: string) {
  const date = parseDay(day);
  return `${WEEKDAY_NAMES[date.getDay()]}, ${
    MONTH_NAMES[date.getMonth()]
  } ${date.getDate()}, ${date.getFullYear()}`;
}

// "October".
export function monthName(day: string) {
  return MONTH_NAMES[parseDay(day).getMonth()];
}

// "Oct".
export function shortMonthName(day: string) {
  return MONTHS[parseDay(day).getMonth()];
}

// A calendar page of the month holding `day`: one row per week, starting on
// `firstDayOfWeek`, with null where a row reaches into another month.
export function monthGrid(day: string, firstDayOfWeek: number) {
  const first = `${day.slice(0, 7)}-01`;
  const next = addMonths(first, 1);
  const weeks: (string | null)[][] = [];
  for (
    let start = weekStart(first, firstDayOfWeek);
    start < next;
    start = addDays(start, 7)
  ) {
    weeks.push(
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(start, index);
        return date >= first && date < next ? date : null;
      }),
    );
  }
  return weeks;
}

// The weekday names over a calendar's columns: "M", "T", "W"...
export function weekdayInitials(firstDayOfWeek: number) {
  return Array.from({ length: 7 }, (_, index) => {
    const weekday = (firstDayOfWeek - 1 + index) % 7;
    return {
      initial: WEEKDAYS[weekday].charAt(0),
      name: WEEKDAY_NAMES[weekday],
    };
  });
}

function sameYear(day: string, other: string) {
  return day.slice(0, 4) === other.slice(0, 4);
}

// "Oct 20", or "Oct 20, 2025" with the year.
export function shortDate(day: string, withYear = false) {
  const date = parseDay(day);
  const label = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return withYear ? `${label}, ${date.getFullYear()}` : label;
}

// "Today", "Yesterday", "Mon, Oct 20"; "Oct 20 – 26", "Sep 29 – Oct 5";
// "October". Dates outside this year carry the year.
export function rangeLabel(range: StatsRange, today: string) {
  switch (range.kind) {
    case "day": {
      const ago = daysBefore(range.fromDay, today);
      if (ago === 0) return "Today";
      if (ago === 1) return "Yesterday";
      const date = shortDate(range.fromDay, !sameYear(range.fromDay, today));
      return `${weekdayLabel(range.fromDay)}, ${date}`;
    }
    case "week": {
      const lastDay = addDays(range.toDay, -1);
      const withYear =
        !sameYear(range.fromDay, today) || !sameYear(lastDay, today);
      const end =
        !withYear && range.fromDay.slice(0, 7) === lastDay.slice(0, 7)
          ? String(parseDay(lastDay).getDate())
          : shortDate(lastDay, withYear);
      return `${shortDate(range.fromDay, withYear)} – ${end}`;
    }
    case "month": {
      const name = monthName(range.fromDay);
      return sameYear(range.fromDay, today)
        ? name
        : `${name} ${range.fromDay.slice(0, 4)}`;
    }
  }
}
