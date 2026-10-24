import { useAppTheme } from "../../theme/ThemeProvider";
import type { BudgetWithUsage } from "../../budgets/types";
import {
  formatDuration,
  formatPeriods,
  formatUpcoming,
  nextPeriodLabel,
} from "../../budgets/format";
import { PeriodPips } from "./PeriodPips";

// "Next 3 days. 20 min borrowed. 40 min left tomorrow", for screen readers.
export function borrowAheadLabel(budget: BudgetWithUsage) {
  const upcoming = formatUpcoming(budget.upcoming.length, budget.period);
  const taken = budget.owedMinutes + budget.borrowedMinutes;
  if (taken === 0) {
    return `${upcoming}. Up to ${formatDuration(budget.borrowLeftMinutes)}`;
  }
  const left = nextPeriodLeft(budget);
  const next = nextPeriodLabel(budget.period);
  return `${upcoming}. ${formatDuration(taken)} borrowed. ${
    left > 0 ? `${formatDuration(left)} left ${next}` : `Nothing left ${next}`
  }`;
}

// Short text shown next to the pips: "3 days to borrow" until something is
// borrowed, then what borrowing leaves of the next period, which pays it
// back first: "Tomorrow: 40 min", "Nothing left tomorrow".
export function borrowAheadSummary(budget: BudgetWithUsage) {
  const taken = budget.owedMinutes + budget.borrowedMinutes > 0;
  if (!taken) {
    return {
      taken,
      text: `${formatPeriods(budget.upcoming.length, budget.period)} to borrow`,
    };
  }
  const left = nextPeriodLeft(budget);
  return {
    taken,
    text:
      left > 0
        ? `${formatUpcoming(1, budget.period)}: ${formatDuration(left)}`
        : `Nothing left ${nextPeriodLabel(budget.period)}`,
  };
}

// The next period's own budget once what's borrowed is paid back.
function nextPeriodLeft(budget: BudgetWithUsage) {
  const next = budget.upcoming[0];
  return next ? Math.max(next.budgetMinutes - next.takenMinutes, 0) : 0;
}

// The upcoming periods that borrowed time comes out of, one pip each, filled
// in rust by how much of each is already taken. Sits right of the usage bar.
// Nothing here changes until time is used or a period ends.
export function BorrowAhead({
  budget,
  pipWidth,
}: {
  budget: BudgetWithUsage;
  pipWidth: number;
}) {
  const { colors } = useAppTheme();
  return (
    <PeriodPips
      pips={budget.upcoming.map((period) => ({
        key: period.startDay,
        filled:
          period.budgetMinutes > 0
            ? period.takenMinutes / period.budgetMinutes
            : 0,
      }))}
      color={colors.borrowed}
      width={pipWidth}
    />
  );
}
