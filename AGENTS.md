This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Project map

Roolio is a screen-time app, Android only for now. An iOS version may come later from this same codebase, so keep code platform-neutral wherever it doesn't need to be Android-specific. Don't build iOS features yet.

Each app gets a budget for one period (day, week or month). Unused time is **banked** for later periods, and extra time can be **borrowed** from upcoming periods, up to a cap. When an app's time runs out, Roolio sends the user home and shows a **pause screen** over the launcher.

Kotlin owns all data and enforcement, and React Native is the UI. Read this map before searching, and keep it up to date when files move or features land.

### Where things live

- `modules/roolio-core/`: the engine, with one SQLite database, the tracking service and the pause screen. The JS API is `index.ts` (it lists the error codes), types are in `src/RoolioCore.types.ts` and the bridge is `android/.../RoolioCoreModule.kt`. The Kotlin lives under `android/src/main/java/expo/modules/roolio/core/`:
  - `budgets/Budgets.kt`: the budget rules. Lists, creates, updates and deletes budgets, rolls them forward (resets), and works out pause status and "keep going" choices.
  - `budgets/Ledger.kt`: pure math for available, banked and borrowed time, caps and repayment.
  - `budgets/Stops.kt`: the pause screen's stopping points. `budgets/Periods.kt`: period starts and ends in local time, and `YYYY-MM-DD` day keys.
  - `budgets/BudgetStore.kt`: SQL for budgets, periods, borrows and settings. `db/RoolioDatabase.kt`: the schema.
  - `tracking/UsageTracker.kt`: measures foreground time from UsageStats events and owns the one background thread. `Visibility.kt` decides what counts as visible time, and `UsageStore.kt` holds daily usage and the restart checkpoint.
  - `tracking/TrackingService.kt`: a foreground service that ticks only while the screen is on. `BootReceiver.kt` restarts it after a reboot.
  - `tracking/PauseEnforcer.kt` decides when to pause, `PauseOverlay.kt` draws the pause screen with native views (`res/layout/roolio_pause_screen.xml`, `res/values*/roolio_pause_*.xml`), and `PauseCopy.kt` writes its text.
  - `tracking/SystemApps.kt`: exempt apps. `tracking/Notifications.kt`: the tracking and permission notifications. Native strings are in `res/values/strings.xml`.
- `modules/roolio-permissions/`: status of Usage Access, Display over other apps and notifications, plus opening the Settings screen for each.
- `modules/installed-apps/`: installed apps (exempt ones left out), app icons and uninstall checks.
- `src/app/`: routes. `(tabs)/index.tsx` is Home, `(tabs)/settings.tsx` is Settings, `add-app.tsx` picks apps, `budget/[packageName].tsx` is app detail and editing, and `permissions.tsx` is onboarding. `_layout.tsx` guards routes with `Stack.Protected` on `needsSetup`.
- `src/budgets/`: the JS side of budgets.
  - `repository.ts` wraps the native module, converts ms to minutes and emits change events.
  - `rules.ts` holds limits, presets, steps and defaults. `format.ts` formats durations and labels.
  - `types.ts` defines `BudgetWithUsage`, the shape screens use. `events.ts` is the change-event bus.
- `src/hooks/budgets/`: `useBudgets` loads the Home list and removes budgets of uninstalled apps, and `useBudget` loads one app. Both use `useBudgetQuery`, which reloads after a write, on returning to the foreground and at midnight.
- `src/permissions/`: `PermissionsProvider` (permission status, `needsSetup`) and `steps.tsx` (onboarding content).
- `src/components/<screen>/`: components grouped by screen, with shared ones in `ui/`.
- `src/theme/`: `tokens.ts` holds colors, spacing and radius, and `ThemeProvider.tsx` provides `useAppTheme()`.
- `src/usage/useUsageSync.ts`: starts or stops tracking when Usage Access changes.
- `DESIGN.md`: the app icon spec.

### How it fits together

- Nothing runs at midnight. Every read and write first rolls budgets forward: it closes ended periods, banks leftover time and repays borrowed time. Periods are keyed by local date, so each period start gets exactly one reset.
- Enforcement doesn't need JS. `TrackingService` (started by `syncTracking()` or at boot) runs `UsageTracker` and `PauseEnforcer`.
- All budget and usage state lives on one thread. Native code reaches it through `UsageTracker.post`, never from another thread.
- Native amounts are ms, always whole minutes, because usage is counted in whole minutes. `repository.ts` converts them to minutes for the UI. Budget settings are in minutes everywhere.

### Changing things

- A new budget field goes through `db/RoolioDatabase.kt`, `BudgetStore.kt`, `Budgets.kt`, `statusToMap` in `RoolioCoreModule.kt`, `RoolioCore.types.ts`, then `src/budgets/types.ts` and `repository.ts`.
- Setting limits (budget 1 min to the period max, ceiling and cap 0–7) are checked in both `src/budgets/rules.ts` and `Budgets.kt`. Keep them in step.
- The pause screen's colors in `res/values*/roolio_pause_colors.xml` copy `src/theme/tokens.ts`. Keep them in step.

### Budget rules

- Available time = own budget + banked time carried in − time used, never below 0. Own budget = budget − what this period repays of earlier borrowing, never below 0.
- Time is spent from the own budget first, then banked time, then borrowed time.
- Periods start at local midnight: every day, on the chosen first day of the week (Monday by default), or on the 1st of the month.
- At reset, leftover time is banked, up to budget × rollover ceiling.
- Borrowing is counted by the minute as time is used. Borrowed time is paid back from the next periods' budgets, nearest first. Time owed can't go above budget × borrow cap, and once it does, the app is blocked until the next reset. Later edits never change minutes already owed.
- Rollover ceiling and borrow cap are counted in periods (any whole number 0–7 for every user, 1 by default). 0 turns each off.
- Edits apply immediately and never change past periods. Changing a budget's period while it owes time needs a `BorrowedChoice`: `clear` or `keep`.
- The pause screen only decides when to stop an app and never changes the numbers. Its choices are "Close app", "5 more minutes" and "Use [next period]'s time".
- Exempt apps are never counted, listed or paused: the dialer, system Settings, launchers and Roolio itself.
- Privacy: all data stays on the device, with no accounts, network or analytics. The only permissions are Usage Access, Display over other apps and notifications (no Accessibility service).

### Not built yet

- Premium: the paywall, the 3-app free limit, and locks on weekly and monthly budgets.
- Group and total-phone budgets. The schema's `kind` column already supports them.
- The history screen. `getHistory()` already exists.
- The "5 minutes left" notification. The `low_alert_at` column already exists.
- The first-day-of-week setting in the UI. `setFirstDayOfWeek()` already exists.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

The developer builds the app (Gradle/Expo) and runs lint and typecheck themselves. Don't run builds, lint, typecheck or `adb`. When a task is done, say what to build and check instead.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Code conventions

- Write every change to production quality. The app hasn't shipped yet, but the code in this repo is the code that will ship.
- Don't mention the app's release status in code or comments: no "unreleased", "not shipped yet", "temporary", "for testing" or similar notes.
- Nothing has shipped, so there's nothing to stay compatible with. Change or remove earlier code, schema and migrations directly (for example, edit a database migration in place) instead of adding compatibility layers or new migrations.
- Don't reference the PRD (`Roolio_PRD.md`) or its section numbers in code or comments. Comments should explain the code on their own.
