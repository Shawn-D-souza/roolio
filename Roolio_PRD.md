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
- When you need more time, you can keep going and **borrow** from the budgets of upcoming periods, up to a cap.
- Changes to budgets take effect **immediately** and never change past periods.
- Budgets can be daily (free), or weekly and monthly (premium).

## 2. Goals

1. Let users set per-app budgets that feel fair and flexible.
2. Replace "raise the limit and forget" with a built-in, capped borrowing system.
3. Make each budget's banked time and borrowed time always visible and easy to understand.
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
- The Accessibility service (see section 10.1 for when it may be added)

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
| **Borrowed time**    | Minutes used beyond the current period's time. They come out of the budgets of upcoming periods, nearest first. |
| **Rollover ceiling** | The maximum banked time, expressed in periods of that budget.                                                    |
| **Borrow cap**       | How many upcoming periods can be borrowed from.                                                                  |
| **Available time**   | The minutes the user can still spend in the current period in a budget, before borrowing.                        |
| **Pause screen**     | The Roolio card shown over the home screen when an app's time runs out and Roolio closes it (section 8.4).       |
| **Exempt apps**      | Apps that can never be limited: Phone/dialer, emergency services, system Settings, and Roolio itself.            |

## 6. Budget rules (core logic)

These rules are exact. Follow them as written.

### 6.1 Budget

- Set per app by the user, for one period (section 4).
- Usage is counted in minutes of foreground (screen-on) time.

### 6.2 Available time

- **Available time = current period's own budget + banked time carried in − time used.**
- The **own budget** is the budget minus any minutes borrowed earlier that this period pays back (section 6.6). It is never below 0.
- Available time is never below 0. Time used past it is borrowed time.

### 6.3 Reset

- A reset happens at the start of each period (section 4).

### 6.4 Rollover (banking)

At reset, leftover available time from the period ending becomes banked time.

- Banked time is capped at **budget × rollover ceiling**. Anything above the cap is lost.
- If the rollover ceiling is 0, nothing is banked.
- Example (daily, budget 60 min, ceiling 1): A fully unused day leaves 60 min to bank. Tomorrow's available time is 60 + 60 = 120 min. If tomorrow is also fully unused, the leftover is 120, but only 60 is banked. The next day is again 120.
- Example (weekly, budget 10 hours, ceiling 1): A fully unused week banks 10 hours, so next week's available time is 20 hours.

### 6.5 Spending order

Time is spent in this order: the period's own budget first, then banked time, then, if the user chooses to keep going on the pause screen, borrowed time from upcoming periods, nearest first.

### 6.6 Borrowing

- The budgets of the next **borrow cap** periods are already there. Borrowing does not create or move time; it only means using it early.
- Borrowed time is counted **by the minute, as it is used**. Using 10 minutes past today's time borrows 10 minutes, not a whole period.
- The pause screen (section 8.4) only decides when the app is stopped. A choice made there never changes the numbers by itself.
- Borrowed time is paid back at each reset: it comes out of the next period's own budget first, and whatever that budget cannot cover moves on to the period after.
- Borrowed time can never exceed **budget × borrow cap**, counting time still to be paid back from earlier periods. When that is used up, the app is blocked until the next reset.
- Borrowed minutes are fixed. Later budget edits do not change how many minutes are owed.
- Example (daily, budget 60 min, cap 3):
  - Monday: the user uses 1h 10m. The last 10 minutes are borrowed from Tuesday.
  - Tuesday: the own budget is 50 min. Tuesday can borrow up to 3 hours, from Wednesday, Thursday and Friday.
- Example (daily, budget 60 min, cap 3): on Monday the user uses 4 hours. Tuesday, Wednesday and Thursday each start with 0, and the app stayed blocked on Monday once Thursday's hour was used.
- Example (weekly, budget 10 hours, cap 1): the user uses 12 hours this week. Next week starts with 8 hours.
- Banked time and borrowed time are tracked separately. Since borrowing only starts once banked time is used up, a period ends with one or the other, never both.

### 6.7 Rollover ceiling and borrow cap settings (two separate settings)

These are chosen **per app**, on the app selection screen when the app is added (and can be edited later, see section 7). They are counted in periods of that app's budget: 3 on a daily budget means 3 days, on a weekly budget 3 weeks, on a monthly budget 3 months.

- Both can be any whole number from 0 to 7, for free and premium users alike.

- **Default for every app is 1 for both.** New budgets bank up to one period of unused time and can borrow one period ahead. The user can set either to 0 to turn it off.
- 0 rollover means unused time is lost at reset. 0 borrow cap means the app is blocked as soon as available time is zero, and the pause screen only offers "Close app".

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

- Past periods and minutes already borrowed never change because of an edit.
- If the ceiling is lowered below the current banked time, banked time is trimmed to the new ceiling immediately.
- If the borrow cap is lowered below the time already borrowed, the borrowed minutes stay owed. No new borrowing is allowed until they are paid back below the new cap.

**Changing an app's period type (premium):**

- A period type change is never blocked. It takes effect immediately: the app switches to the new period right away, and usage already spent in the current day, week, or month counts toward the new period. Past periods are never changed.
- A warning is shown before the change is applied, explaining that it takes effect now.
- Banked time (in minutes) is kept and capped by the new ceiling at the switch.
- If the app has borrowed time still to be paid back, the warning offers two choices:
  1. **Clear the borrowed:** nothing is owed anymore, and the future periods return to their full budget.
  2. **Keep the borrowed:** the borrowed minutes stay owed exactly as they are (120 min owed stays 120 min, not converted to periods). They are deducted from the new period's upcoming budgets. Example: 120 min owed, new weekly budget of 10 hours, so next week's available time is 8 hours.
- Time borrowed in the current period is not owed separately: its usage already counts toward the new period.
- Changing the first day of the week (Settings) takes effect at the start of the next week.

## 8. Features and requirements

### 8.1 Onboarding (first launch)

1. Three short screens explaining budget, bank, and borrow, with one visual example.
2. Permission requests (see section 10), each with a plain-language explanation of why it is needed. Roolio cannot work without Usage Access and Display over other apps.
   - Permissions granted in system Settings (Usage Access, Display over other apps) use two screens: first **why** (what it is for, plus a few words the user can take in at a glance, such as "Your data always stays: Private, Offline, On this phone"; a "Learn more" sheet answers the full questions, such as what Roolio sees, what it can't see, and where the data goes), then **how** (numbered steps with sketches of the Settings screens the user will see), then Settings opens.
   - Sketches of system screens use neutral Android styling, not Roolio's theme, so they match what the user will actually see.
   - Roolio returns to the front by itself once the permission is granted, where Android allows it. Otherwise the user comes back with Back, and Roolio says if the permission is still off.
   - The same screens appear whenever Roolio is opened with a required permission missing. If the permission was granted before and later turned off, the wording says so and reassures the user that their budgets are kept.
3. Choose apps: a searchable list of installed apps (exempt apps are not shown). Free users can select up to 3.
4. For each selected app, on its selection screen: set the budget and the period (daily; weekly and monthly are shown with a premium lock for free users), then rollover ceiling and borrow cap. Both default to 1.
5. Finish on the Home screen. Budgets are active immediately.

### 8.2 Home screen

- A card for each limited app showing: app icon and name, available time, time used in the current period, and two bars:
  - **This period:** its own budget and banked time as separate segments, with usage filling them in spending order. Any part of the budget that went to paying back earlier borrowing is shown as its own segment, so the bar reads as "1h budget, 10 min of it already used".
  - **Ahead:** one segment for each upcoming period that can be borrowed from (the borrow cap), showing how much of each is already taken (e.g., "10 min borrowed", "3 days to borrow"). Hidden when the borrow cap is 0 and nothing is owed.
- Banked time is shown in words too (e.g., "Banked: 40 min").
- The bars only change with usage and at resets, never because of a choice on the pause screen.
- Cards are sorted by least available time first.
- A button to add an app. When a free user already has 3 apps, this opens the premium paywall.
- Tapping a card opens App detail.
- A banner appears if any required permission is missing (see section 9).

### 8.3 App detail

- Shows usage in the current period, available time, banked time, borrowed time, budget and period, and rollover ceiling and borrow cap for this app.
- Edit budget, period (premium), rollover ceiling, and borrow cap (follows the editing rules in section 7).
- Remove budget (follows section 7).
- Free users see only the current period's numbers. Premium users also see history (section 8.7).

### 8.4 Pause screen

At each stopping point, Roolio closes the app (the user is returned to the home screen) and shows the pause screen: a card over the dimmed home screen. This happens both when the user opens the app and when a stopping point is reached during use. It only decides when the app is stopped; it never changes budgets, banked time or borrowed time.

**Stopping points:**

- When the current period's available time reaches zero.
- After that, at the end of each upcoming period's budget the user chose to borrow from (one stop per period, up to the borrow cap).
- After "5 more minutes", when those 5 minutes end.

**Choices:**

- **Close app:** closes the pause screen. The user is already on the home screen.
- **5 more minutes:** reopens the app where the user left it, for 5 minutes borrowed from the upcoming periods (fewer when less than 5 minutes can still be borrowed). When they end, the app closes, and the pause screen appears again.
- **Use [next period]'s time:** reopens the app until that period's remaining budget is used, for example "Use Tuesday's 50 min", "Use next week's 10 hours". The screen shows how many periods are left to borrow from (e.g., "2 of 3 left").
- The borrowing choices are shown only while borrowing is possible. When the cap is reached (or borrowing is off), only "Close app" is shown, with a note about when the app has time again.
- Reopening the app after a choice continues to the same stopping point; the pause screen is not shown again before it.

**Dismissing:**

- Back, or a tap outside the card, does the same as "Close app". Going Home or to Recents closes it too.
- Dismissing never lets the user back into the app: the app is already closed, and reopening it shows the pause screen again at the same stopping point.
- If another app comes to the front (for example an incoming call or a tapped notification), the pause screen closes, so it never covers it.
- It closes when the screen turns off.

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
3. **Total phone budget:** one budget across all non-exempt apps, with its own period (daily, weekly, or monthly), banked time, borrowed time, ceiling, and cap, following the same rules. Time in any app counts against both its own budget and the total. If either budget reaches zero, the app is blocked. If both are at zero, the pause screen offers borrowing for each exhausted budget separately, and the app is stopped at whichever stopping point comes first.
4. **App groups:** a group (e.g., "Social") shares one budget with its own period, banked time, borrowed time, ceiling, and cap. An app can be in at most one group, and an app in a group does not also have its own individual budget.
5. **Stats and history:** for each budget, the complete history since the budget was created, shown per period (days, weeks, or months, matching the budget's period) as usage against budget, plus banked and borrowed totals. History is never deleted automatically and is stored on the device only. It is lost only if the app or Roolio is uninstalled (no backup in v1).

## 9. Edge cases

- **Permission revoked:** Roolio stops enforcing budgets, shows a banner on Home, and sends a notification with a shortcut to re-grant. Budgets, banked time, and borrowed time are kept.
- **Time zone or clock change:** Period starts follow device local time. One reset per period start (section 4).
- **Unused borrowed time:** There is none. Borrowed time is counted only as it is used, so choosing to borrow and then not using the time costs nothing.
- **Premium lapses:**
  - Only 3 apps stay enforced: the 3 daily-budget apps added earliest. Other apps keep their settings but are not enforced until the user upgrades.
  - Apps with weekly or monthly budgets are not enforced. They keep their settings.
  - The total budget and groups stop being enforced at the next reset and are kept but locked.
  - Stats are locked but kept.
- **App uninstalled:** Its budget and history are removed.
- **App reinstalled or Roolio uninstalled:** Data is lost (no backup in v1). Settings explains this.
- **Phone restarted:** Budgets, banked time, borrowed time, and usage so far persist.
- **Exempt apps:** Never counted, never blocked, never listed.
- **No apps added:** Home shows an empty state with a button to add the first app.

## 10. Permissions and privacy

**Permissions Roolio asks for (and nothing else):**

1. **Usage Access:** to measure time spent in apps.
2. **Display over other apps:** to show the pause screen.
3. **Notifications:** for the alerts in section 8.5.

Roolio does not ask for Accessibility, location, contacts, storage, camera, or microphone.

### 10.1 Future: Accessibility service (not in v1)

v1 detects app use with Usage Access only. This keeps the permission list minimal, matches the privacy promise above, and avoids the extra Google Play review that the Accessibility API requires for apps that are not accessibility tools.

Known trade-offs of Usage Access alone:

- The pause screen can appear up to about a second after an app opens, because Roolio checks the foreground app on a short interval instead of being told instantly.
- On phones that aggressively stop background apps (for example Xiaomi, Oppo/Realme, Vivo, Huawei), Roolio's background service may be stopped unless the user exempts it from battery restrictions.

Revisit after launch, based on user feedback and reliability data (reviews, uninstall reasons, reports that the pause screen was late or did not appear). If Accessibility is added:

- It is offered during onboarding as the **recommended** option, with Usage Access as the fallback for users who decline it. A user who declines must still get a working app.
- It needs Google Play's Accessibility declaration, a prominent in-app disclosure, and an update to section 10 and goal 4.

**Privacy principles:**

- No account and no login.
- All data (budgets, banked time, borrowed time, usage, history) is stored only on the user's device.
- Nothing is uploaded to any server. Roolio does not collect, share, or sell user data.
- No ads.
- Subscription payment and restore are handled by Google Play.

## 11. Monetization

|                                  | Free                | Premium                |
| -------------------------------- | ------------------- | ---------------------- |
| Apps with budgets                | Up to 3             | Unlimited              |
| Budget periods                   | Daily               | Daily, weekly, monthly |
| Rollover and borrowing (per app) | 0 to 7              | 0 to 7                 |
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
6. As a user, I want to see my banked time and borrowed time for each app at a glance so I always know where I stand.
7. As a user, I want my data to stay on my phone so I can trust the app.
8. As a premium user, I want weekly and monthly budgets, unlimited apps, a total budget, groups, and full history so I can tailor Roolio to my habits.
