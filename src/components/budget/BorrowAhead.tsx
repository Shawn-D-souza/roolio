import { useAppTheme } from "../../theme/ThemeProvider";
import type { BudgetWithUsage } from "../../budgets/types";
import {
  formatDuration,
  formatPeriods,
  formatUpcoming,
} from "../../budgets/format";
import { PeriodPips } from "./PeriodPips";

// "Next 3 days. 10 min borrowed", for screen readers.
export function borrowAheadLabel(budget: BudgetWithUsage) {
  return `${formatUpcoming(budget.upcoming.length, budget.period)}. ${borrowAheadStatus(budget)}`;
}

function borrowAheadStatus(budget: BudgetWithUsage) {
  const taken = budget.owedMinutes + budget.borrowedMinutes;
  if (taken === 0) return `Up to ${formatDuration(budget.borrowLeftMinutes)}`;
  if (budget.borrowLeftMinutes === 0) {
    return `All ${formatDuration(taken)} borrowed`;
  }
  return `${formatDuration(taken)} borrowed`;
}

// Short text shown next to the pips: "3 days to borrow", "10 min borrowed".
export function borrowAheadSummary(budget: BudgetWithUsage) {
  const taken = budget.owedMinutes + budget.borrowedMinutes > 0;
  return {
    taken,
    text: taken
      ? borrowAheadStatus(budget)
      : `${formatPeriods(budget.upcoming.length, budget.period)} to borrow`,
  };
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
