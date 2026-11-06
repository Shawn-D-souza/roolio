// Sample data for screenshots, as SQL for a copy of Roolio Dev's database.
//
// Only budgets, one old open period and daily usage are written. Roolio then
// rolls each budget forward with its own rules, so every banked and borrowed
// minute on screen is what the app really works out.

const MINUTE_MS = 60_000;
const HISTORY_DAYS = 70;

// Apps on the developer's phone. A budget of an uninstalled app gets removed.
const REDDIT = { packageName: "com.reddit.frontpage", appName: "Reddit" };
const TELEGRAM = { packageName: "org.telegram.messenger", appName: "Telegram" };
const LINKEDIN = { packageName: "com.linkedin.android", appName: "LinkedIn" };
const MINECRAFT = { packageName: "com.mojang.minecraftpe", appName: "Minecraft" };
const WHATSAPP = { packageName: "com.whatsapp", appName: "WhatsApp" };
// Has no account and works offline, so it's safe to open for the pause screen.
const VLC = { packageName: "org.videolan.vlc", appName: "VLC" };

// `recent` is minutes per day going back from yesterday, repeated as needed.
const SCENARIOS = {
  empty: [],
  everyday: [
    {
      ...REDDIT,
      period: "day",
      budgetMinutes: 60,
      ceiling: 1,
      cap: 1,
      today: 34,
      recent: [38, 72, 41, 55, 20, 64, 47],
    },
    {
      ...TELEGRAM,
      period: "day",
      budgetMinutes: 45,
      ceiling: 2,
      cap: 1,
      today: 12,
      recent: [15, 28, 40, 18, 33, 12, 25],
    },
    {
      ...LINKEDIN,
      period: "day",
      budgetMinutes: 20,
      ceiling: 0,
      cap: 2,
      today: 9,
      recent: [46, 18, 12, 30, 9, 14, 21],
    },
    {
      ...MINECRAFT,
      period: "week",
      budgetMinutes: 240,
      ceiling: 1,
      cap: 1,
      today: 45,
      recent: [60, 0, 35, 0, 90, 20, 0],
    },
    {
      ...WHATSAPP,
      period: "month",
      budgetMinutes: 900,
      ceiling: 1,
      cap: 1,
      today: 22,
      recent: [28, 19, 35, 24, 17, 31, 26],
    },
  ],
  // From one day each way up to the most a budget can have, drained or owing.
  crowded: [
    {
      ...REDDIT,
      period: "day",
      budgetMinutes: 60,
      ceiling: 1,
      cap: 1,
      today: 34,
      recent: [38, 72, 41, 55, 20, 64, 47],
    },
    {
      ...TELEGRAM,
      period: "day",
      budgetMinutes: 45,
      ceiling: 3,
      cap: 2,
      today: 70,
      recent: [15, 28, 40, 18, 33, 12, 25],
    },
    {
      ...LINKEDIN,
      period: "day",
      budgetMinutes: 60,
      ceiling: 7,
      cap: 7,
      today: 36,
      recent: [10, 25, 15, 30, 5, 20, 12],
    },
    {
      ...WHATSAPP,
      period: "day",
      budgetMinutes: 30,
      ceiling: 7,
      cap: 7,
      today: 105,
      recent: [30],
    },
  ],
  // Out of time, with next period's time still on offer.
  "pause-out": [
    {
      ...VLC,
      period: "day",
      budgetMinutes: 30,
      ceiling: 0,
      cap: 1,
      today: 30,
      recent: [25, 18, 30, 12],
    },
  ],
  // Out of time, with borrowing off: "Got it" is the only choice.
  "pause-blocked": [
    {
      ...VLC,
      period: "day",
      budgetMinutes: 30,
      ceiling: 0,
      cap: 0,
      today: 30,
      recent: [25, 18, 30, 12],
    },
  ],
};

export const SAMPLE_APPS = [REDDIT, TELEGRAM, LINKEDIN, MINECRAFT, WHATSAPP, VLC];
export const SCENARIO_NAMES = Object.keys(SCENARIOS);

const dayKey = (date) => date.toISOString().slice(0, 10);

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

// The first period of a budget, some way back, as local YYYY-MM-DD keys.
// Weeks start on Monday, Roolio's default.
function firstPeriod(period, today) {
  const back = addDays(today, -HISTORY_DAYS);
  if (period === "day") return [back, addDays(back, 1)];
  if (period === "week") {
    const start = addDays(back, -((back.getUTCDay() + 6) % 7));
    return [start, addDays(start, 7)];
  }
  const start = new Date(Date.UTC(back.getUTCFullYear(), back.getUTCMonth(), 1));
  return [start, new Date(Date.UTC(back.getUTCFullYear(), back.getUTCMonth() + 1, 1))];
}

/** SQL that replaces all of Roolio's data with `scenario`, as of `todayKey`. */
export function seedSql(scenario, todayKey) {
  const budgets = SCENARIOS[scenario];
  if (!budgets) throw new Error(`Unknown scenario "${scenario}"`);
  const today = new Date(`${todayKey}T00:00:00Z`);
  const createdAt = today.getTime() - HISTORY_DAYS * 24 * 60 * MINUTE_MS;
  const sql = [
    "BEGIN;",
    // The checkpoint goes too, so the tracker starts from now and doesn't
    // count the phone's real usage into the sample apps.
    ...["borrows", "periods", "budget_apps", "budgets", "daily_usage", "coverage", "tracker_state"].map(
      (table) => `DELETE FROM ${table};`,
    ),
  ];
  budgets.forEach((budget, index) => {
    const id = index + 1;
    const [start, end] = firstPeriod(budget.period, today);
    sql.push(
      `INSERT INTO budgets (id, kind, period, budget_minutes, rollover_ceiling, borrow_cap, created_at, updated_at)
       VALUES (${id}, 'app', '${budget.period}', ${budget.budgetMinutes}, ${budget.ceiling}, ${budget.cap}, ${createdAt}, ${createdAt});`,
      `INSERT INTO budget_apps (package_name, budget_id, app_name, icon_version, added_at)
       VALUES ('${budget.packageName}', ${id}, '${budget.appName}', 1, ${createdAt});`,
      `INSERT INTO periods (budget_id, period, start_day, end_day, opened_at, budget_minutes)
       VALUES (${id}, '${budget.period}', '${dayKey(start)}', '${dayKey(end)}', ${createdAt}, ${budget.budgetMinutes});`,
      // History starts at the first period, so nothing is recounted from Android.
      `INSERT INTO coverage (package_name, covered_from) VALUES ('${budget.packageName}', ${createdAt});`,
      `INSERT INTO daily_usage (package_name, day, foreground_ms)
       VALUES ('${budget.packageName}', '${todayKey}', ${budget.today * MINUTE_MS});`,
    );
    for (let back = 1; back <= HISTORY_DAYS; back++) {
      const minutes = budget.recent[(back - 1) % budget.recent.length];
      if (minutes === 0) continue;
      sql.push(
        `INSERT INTO daily_usage (package_name, day, foreground_ms)
         VALUES ('${budget.packageName}', '${dayKey(addDays(today, -back))}', ${minutes * MINUTE_MS});`,
      );
    }
  });
  sql.push("COMMIT;");
  return sql.join("\n");
}
