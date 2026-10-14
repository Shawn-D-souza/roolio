# Roolio: Product Requirements Document (v1)

## 1. Overview

**Product:** Roolio, an Android digital well-being app.
**One-line pitch:** A screen-time budget that rolls over. Unused time is banked for later, and you can borrow from upcoming periods when you need more.
**Platform (v1):** Android only.
**Build note:** Roolio is built with the Expo framework. Android is the only platform that is built, tested, and supported in v1. Where code would help a future iOS version (for example, logic and structure that are not Android-specific), write it so it can be reused later, but do not build, test, or ship iOS features in v1. There is no way to test iOS right now.
**Target user (v1):** Adults aged 18+ who want to manage their own app usage.
**Business model:** Freemium with a monthly or yearly premium subscription.

### The problem

Traditional digital well-being apps use a fixed daily limit. When a person wants a little more time, they raise the limit, then forget to lower it again. Limits become either too rigid (so people ignore them) or too easy to change (so they stop working). A fixed limit also wastes the time a person did not use.

### The solution

Each limit becomes a **budget** with banking and borrowing:

- Time you don't use in a period is **banked** and can be used in later periods (rollover).
- When you need more time, you can **borrow** the budget of an upcoming period, up to a cap.
- Changes to budgets take effect **immediately** and never change past periods.
- Budgets can be daily (free), or weekly and monthly (premium).

## 2. Goals

1. Let users set per-app budgets that feel fair and flexible.
2. Replace "raise the limit and forget" with a built-in, capped borrowing system.
3. Make each budget's banked time and borrowed periods always visible and easy to understand.
4. Earn user trust through minimal permissions and fully on-device data.

## 3. Out of scope for v1

Roolio v1 does **not** include:

- More than one budget period on the same app (for example, daily and weekly together)
- Periods other than day, week, and month
- iOS features (not built or tested in v1; see the build note in section 1), web, or tablet-optimized layouts
- Accounts, login, cloud sync, backup, or transfer between phones
- Teen, child, or parental-control modes
- Different budgets for different days of the week
- Time-of-day schedules, focus modes, or website limits
- Social features, sharing, or leaderboards
- Ads
- Home screen widgets

## 4. Budget periods

Every budget uses exactly one **period**. An app picks one: daily, weekly, or monthly.

| Period      | Availability | Starts                                                                                   |
| ----------- | ------------ | ---------------------------------------------------------------------------------------- |
| **Daily**   | Free         | Midnight, device local time                                                              |
| **Weekly**  | Premium only | Midnight at the start of the user's chosen first day of the week (Settings, section 8.6) |
| **Monthly** | Premium only | Midnight at the start of the 1st of each calendar month, device local time               |

- Everything in this document that says "period" applies to whichever period the budget uses.
- Roolio never grants a second reset for the same period start, even if the time zone or clock changes.

## 5. Glossary

| Term                 | Meaning                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Budget**           | The minutes a user allows themselves in an app (or group, or the whole phone) for one period.                    |
| **Period**           | A day, a week, or a month (section 4).                                                                           |
| **Banked time**      | Unused time carried forward to later periods.                                                                    |
| **Borrowed period**  | A future period whose budget the user has already taken. When that period arrives, its budget is used up (zero). |
| **Rollover ceiling** | The maximum banked time, expressed in periods of that budget.                                                    |
| **Borrow cap**       | The maximum number of future periods that can be borrowed at once.                                               |
| **Available time**   | The minutes the user can still spend in the current period in a budget.                                          |
| **Pause screen**     | The full-screen Roolio screen shown over an app when its available time is zero.                                 |
| **Exempt apps**      | Apps that can never be limited: Phone/dialer, emergency services, system Settings, and Roolio itself.            |

## 6. Budget rules (core logic)

These rules are exact. Follow them as written.

### 6.1 Budget

- Set per app by the user, for one period (section 4).
- Usage is counted in minutes of foreground (screen-on) time.

### 6.2 Available time

- **Available time = current period's budget + banked time carried in + minutes gained by borrowing in this period.**
- If the current period is a borrowed period, its budget is 0.
- Available time is never below 0.

### 6.3 Reset

- A reset happens at the start of each period (section 4).

### 6.4 Rollover (banking)

At reset, leftover available time from the period ending becomes banked time.

- Banked time is capped at **budget × rollover ceiling**. Anything above the cap is lost.
- If the rollover ceiling is 0, nothing is banked.
- Example (daily, budget 60 min, ceiling 1): A fully unused day leaves 60 min to bank. Tomorrow's available time is 60 + 60 = 120 min. If tomorrow is also fully unused, the leftover is 120, but only 60 is banked. The next day is again 120.
- Example (weekly, budget 10 hours, ceiling 1): A fully unused week banks 10 hours, so next week's available time is 20 hours.

### 6.5 Spending order

Time is spent in this order: the period's budget first, then banked time. When both reach zero, the pause screen appears.

### 6.6 Borrowing

- Borrowing is offered only on the pause screen, and only if the borrow cap is above 0.
- Each borrow takes **the full budget of the next upcoming period that has not been borrowed yet**. The user does not choose an amount.
- The minutes gained are available immediately. The borrowed period's budget becomes 0 when that period arrives.
- The amount gained is fixed at the moment of borrowing. Later budget edits do not change it.
- The number of borrowed future periods at once cannot exceed the **borrow cap**.
- A borrow does not need to be repaid before borrowing again. The user can borrow repeatedly until the cap is reached.
- As each period passes, a borrowed period becomes the current period (with a budget of 0), which frees a slot, and the user can borrow the next period ahead.
- Example (daily, budget 60 min, cap 3):
  - Monday: the user runs out and borrows Tuesday's 60 min. When they run out again, they borrow Wednesday's 60, then Thursday's 60. The cap of 3 is now reached.
  - Tuesday: the budget is 0 (borrowed). Wednesday and Thursday are still borrowed (2 of 3 slots used), so the user can borrow Friday's 60 min.
- Example (daily, budget 60 min, cap 1): the user borrows tomorrow's 60 min today. Tomorrow's budget is 0. Once tomorrow has started, the user can borrow the day after.
- Example (weekly, budget 10 hours, cap 1): the user borrows next week's 10 hours this week. Next week's budget is 0.
- Banked time and borrowed periods are tracked separately. A user can have both.

### 6.7 Rollover ceiling and borrow cap settings (two separate settings)

These are chosen **per app**, on the app selection screen when the app is added (and can be edited later, see section 7). They are counted in periods of that app's budget: 3 on a daily budget means 3 days, on a weekly budget 3 weeks, on a monthly budget 3 months.

|                  | Free          | Premium                              |
| ---------------- | ------------- | ------------------------------------ |
| Rollover ceiling | 0, 1, 3, or 7 | Custom: any whole number from 0 to 7 |
| Borrow cap       | 0, 1, 3, or 7 | Custom: any whole number from 0 to 7 |

- **Default for every app is 1 for both.** New budgets bank up to one period of unused time and can borrow one period ahead. The user can set either to 0 to turn it off.
- 0 rollover means unused time is lost at reset. 0 borrow cap means the pause screen never offers borrowing.

## 7. Editing rules

All edits take effect immediately. Edits never change the past.

| Action                                       | When it takes effect                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| Add a new app budget                         | Immediately. Usage already spent in the current period counts against it.             |
| Raise or lower a budget                      | Immediately. Usage already spent in the current period counts against the new budget. |
| Remove an app's budget                       | Immediately                                                                           |
| Change rollover ceiling or borrow cap        | Immediately                                                                           |
| Change an app's period type (premium)        | Immediately (see below)                                                               |
| Move an app into or out of a group (premium) | Immediately                                                                           |
| Change or remove the total budget (premium)  | Immediately                                                                           |

Details:

- Past periods and already-borrowed periods never change because of an edit. Time already gained by borrowing stays available.
- If the ceiling is lowered below the current banked time, banked time is trimmed to the new ceiling immediately.
- If the borrow cap is lowered below the number of periods already borrowed, those borrowed periods stay. No new borrowing is allowed until the borrowed periods fall under the new cap.

**Changing an app's period type (premium):**

- A period type change is never blocked. It takes effect immediately: the app switches to the new period right away, and usage already spent in the current day, week, or month counts toward the new period. Past periods are never changed.
- A warning is shown before the change is applied, explaining that it takes effect now.
- Banked time (in minutes) is kept and capped by the new ceiling at the switch.
- If the app has borrowed periods, the warning offers two choices:
  1. **Clear the borrowed:** nothing is owed anymore, and the future periods return to their full budget. Time already gained and used stays used.
  2. **Keep the borrowed:** the borrowed amount stays exactly as it was, as a fixed number of minutes (it is not converted, so 2 borrowed days of 60 min remain 120 min owed, not 2 weeks). It is deducted from the new period's upcoming budgets. Example: 120 min owed, new weekly budget of 10 hours, so next week's available time is 8 hours.
- Changing the first day of the week (Settings) takes effect at the start of the next week.

## 8. Features and requirements

### 8.1 Onboarding (first launch)

1. Three short screens explaining budget, bank, and borrow, with one visual example.
2. Permission requests (see section 10), each with a plain-language explanation of why it is needed. Roolio cannot work without Usage Access and Display over other apps.
3. Choose apps: a searchable list of installed apps (exempt apps are not shown). Free users can select up to 3.
4. For each selected app, on its selection screen: set the budget and the period (daily; weekly and monthly are shown with a premium lock for free users), then rollover ceiling and borrow cap. Both default to 1.
5. Finish on the Home screen. Budgets are active immediately.

### 8.2 Home screen

- A card for each limited app showing: app icon and name, available time, a progress bar of usage in the current period, banked time (e.g., "Banked: 40 min"), and borrowed periods (e.g., "Borrowed: 2 days ahead", "1 week ahead", "1 month ahead").
- Cards are sorted by least available time first.
- A button to add an app. When a free user already has 3 apps, this opens the premium paywall.
- Tapping a card opens App detail.
- A banner appears if any required permission is missing (see section 9).

### 8.3 App detail

- Shows usage in the current period, available time, banked time, borrowed periods, budget and period, and rollover ceiling and borrow cap for this app.
- Edit budget, period (premium), rollover ceiling, and borrow cap (follows the editing rules in section 7).
- Remove budget (follows section 7).
- Free users see only the current period's numbers. Premium users also see history (section 8.7).

### 8.4 Pause screen

Shown full-screen over an app when its available time is zero, both when the user opens the app and when time runs out during use.

- Shows: app name, "You've used your time", and current banked time (zero at this point) and borrowed periods.
- **Borrow button:** shown only if a borrowing slot remains under the cap. It states exactly what the user will get, for example "Borrow Tuesday's 60 min", "Borrow next week's 10 hours", or "Borrow next month's 40 hours". The screen also shows how many borrowing slots are left (e.g., "2 of 3 left").
- **Close app button:** returns the user to the home screen.
- If no slot remains (or borrowing is off), only "Close app" is shown, with a note about when the budget resets or when more borrowing becomes available.
- The pause screen cannot be dismissed in any way that lets the user stay in the app without borrowing.

### 8.5 Notifications

- One notification when **5 minutes** of available time remain in a budget (once per budget per period).
- A notification if a required permission is revoked.
- No other notifications in v1.

### 8.6 Settings

- Premium status and manage subscription.
- First day of the week (shown to premium users; defaults to Monday until the user chooses).
- Permission status with shortcuts to grant missing permissions.
- Privacy statement (section 10).
- About and version.

### 8.7 Premium features

Premium unlocks:

1. **Unlimited apps:** free users can limit up to 3 apps.
2. **Weekly and monthly budgets:** section 4.
3. **Total phone budget:** one budget across all non-exempt apps, with its own period (daily, weekly, or monthly), banked time, borrowed periods, ceiling, and cap, following the same rules. Time in any app counts against both its own budget and the total. If either budget reaches zero, the app is blocked. If both are at zero, the pause screen offers borrowing for each exhausted budget separately.
4. **App groups:** a group (e.g., "Social") shares one budget with its own period, banked time, borrowed periods, ceiling, and cap. An app can be in at most one group, and an app in a group does not also have its own individual budget.
5. **Custom ceiling and cap:** section 6.7.
6. **Stats and history:** for each budget, the complete history since the budget was created, shown per period (days, weeks, or months, matching the budget's period) as usage against budget, plus banked and borrowed totals. History is never deleted automatically and is stored on the device only. It is lost only if the app or Roolio is uninstalled (no backup in v1).

## 9. Edge cases

- **Permission revoked:** Roolio stops enforcing budgets, shows a banner on Home, and sends a notification with a shortcut to re-grant. Budgets, banked time, and borrowed periods are kept.
- **Time zone or clock change:** Period starts follow device local time. One reset per period start (section 4).
- **Unused borrowed time:** Time gained by borrowing that is still unused at the end of the period is treated like any other leftover and rolls into banked time (subject to the ceiling).
- **Premium lapses:**
  - Only 3 apps stay enforced: the 3 daily-budget apps added earliest. Other apps keep their settings but are not enforced until the user upgrades.
  - Apps with weekly or monthly budgets are not enforced. They keep their settings.
  - The total budget and groups stop being enforced at the next reset and are kept but locked.
  - Ceiling and cap values that are not free values (0, 1, 3, 7) change to the nearest lower free value at the next reset.
  - Stats are locked but kept.
- **App uninstalled:** Its budget and history are removed.
- **App reinstalled or Roolio uninstalled:** Data is lost (no backup in v1). Settings explains this.
- **Phone restarted:** Budgets, banked time, borrowed periods, and usage so far persist.
- **Exempt apps:** Never counted, never blocked, never listed.
- **No apps added:** Home shows an empty state with a button to add the first app.

## 10. Permissions and privacy

**Permissions Roolio asks for (and nothing else):**

1. **Usage Access:** to measure time spent in apps.
2. **Display over other apps:** to show the pause screen.
3. **Notifications:** for the alerts in section 8.5.

Roolio does not ask for Accessibility, location, contacts, storage, camera, or microphone.

**Privacy principles:**

- No account and no login.
- All data (budgets, banked time, borrowed periods, usage, history) is stored only on the user's device.
- Nothing is uploaded to any server. Roolio does not collect, share, or sell user data.
- No ads.
- Subscription payment and restore are handled by Google Play.

## 11. Monetization

|                                  | Free                | Premium                |
| -------------------------------- | ------------------- | ---------------------- |
| Apps with budgets                | Up to 3             | Unlimited              |
| Budget periods                   | Daily               | Daily, weekly, monthly |
| Rollover and borrowing (per app) | 0, 1, 3, or 7       | Custom 0 to 7          |
| Pause screen and notifications   | Yes                 | Yes                    |
| Total phone budget               | No                  | Yes                    |
| App groups                       | No                  | Yes                    |
| Stats and history                | Current period only | Full history           |

**Pricing:** $2.99 per month or $19.99 per year, with a 7-day free trial. The paywall appears when a free user taps a premium feature (including adding a 4th app or choosing weekly or monthly), and a clearly marked premium section exists in Settings. The paywall never blocks the free features.

## 12. Success metrics (launch targets)

- **Activation:** 70% of installs complete onboarding and set at least one budget.
- **Engagement:** 60% of activated users have at least 3 app budgets.
- **Core behavior:** 30% of active users use banked time or borrow at least once per week.
- **Retention:** 35% Day-7 retention.
- **Conversion:** 4% of activated users start a premium trial, and 50% of trials convert to paid.

## 13. User stories

1. As a user, I want to set a budget for each app so I can control my time with specific apps.
2. As a user, I want unused time to be banked so I'm not penalized for being disciplined.
3. As a user, I want to borrow an upcoming period's budget when I need more, so I don't have to change my limit and forget to change it back.
4. As a user, I want my edits to take effect right away so my budget always matches what I set.
5. As a user, I want to choose per app whether time rolls over and whether I can borrow, with sensible defaults (one period each) that I can change or turn off.
6. As a user, I want to see my banked time and borrowed periods for each app at a glance so I always know where I stand.
7. As a user, I want my data to stay on my phone so I can trust the app.
8. As a premium user, I want weekly and monthly budgets, unlimited apps, a total budget, groups, and custom settings so I can tailor Roolio to my habits.
