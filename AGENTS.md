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
  - `tracking/SystemApps.kt`: exempt apps. `tracking/Notifications.kt`: the tracking, permission and time-left notifications. Native strings are in `res/values/strings.xml`.
- `modules/roolio-permissions/`: status of Usage Access, Display over other apps and notifications, plus opening the Settings screen for each.
- `modules/installed-apps/`: installed apps (exempt ones left out), app icons and uninstall checks.
- `src/app/`: routes. `(tabs)/index.tsx` is Home, `(tabs)/settings.tsx` is Settings, `add-app.tsx` picks apps, `budget/[packageName].tsx` is app detail, editing and removal, and `permissions.tsx` is onboarding. `_layout.tsx` guards routes with `Stack.Protected` on `needsSetup`.
- `src/budgets/`: the JS side of budgets.
  - `repository.ts` wraps the native module, converts ms to minutes and emits change events.
  - `rules.ts` holds limits, presets, steps and defaults. `format.ts` formats durations and labels.
  - `types.ts` defines `BudgetWithUsage`, the shape screens use. `events.ts` is the change-event bus.
- `src/hooks/budgets/`: `useBudgets` loads the Home list and removes budgets of uninstalled apps, and `useBudget` loads one app. Both use `useBudgetQuery`, which reloads after a write, on returning to the foreground and at midnight.
- `src/permissions/`: `PermissionsProvider` (permission status, `needsSetup`, and the notifications step's "Not now" and "Don't ask again", which is saved in `roolio-permissions`) and `steps.tsx` (onboarding content).
- `src/components/<screen>/`: components grouped by screen, with shared ones in `ui/`.
- `src/theme/`: `tokens.ts` holds colors, spacing and radius, and `ThemeProvider.tsx` provides `useAppTheme()`.
- `src/usage/useUsageSync.ts`: starts or stops tracking when Usage Access changes.
- `DESIGN.md`: the app icon spec.
- `site/`: the public website (Astro, static), a separate npm project with its own `package.json` and README. It's left out of the app's TypeScript, ESLint and Metro. `src/pages/privacy.astro` is the privacy policy, `src/components/home/` holds the homepage sections, `src/components/mock/` holds HTML copies of app screens, and `src/config.ts` holds the developer name, the contact email and the Google Play link.

### How it fits together

- Nothing runs at midnight. Every read and write first rolls budgets forward: it closes ended periods, banks leftover time and repays borrowed time. Periods are keyed by local date, so each period start gets exactly one reset.
- Enforcement doesn't need JS. `TrackingService` (started by `syncTracking()` or at boot) runs `UsageTracker` and `PauseEnforcer`.
- `PauseEnforcer` checks every budgeted app on screen, not only the one in front, because picture-in-picture and split-screen time counts too. An app that isn't in front (a small window, picture-in-picture) can't be closed without Accessibility, so the pause screen pauses its media (a media pause key, plus audio focus) and comes back 5 s after each dismissal while the window stays open.
- `PauseEnforcer` also sends the time-left alerts, 5 minutes and 1 minute before each pause. `Stops.alertDue` decides them, and the open period's `alert_stop_ms` and `alert_left_ms` record the last one sent, so each stopping point gets each alert once.
- All budget and usage state lives on one thread. Native code reaches it through `UsageTracker.post`, never from another thread.
- Native amounts are ms, always whole minutes, because usage is counted in whole minutes. `repository.ts` converts them to minutes for the UI. Budget settings are in minutes everywhere.

### Changing things

- A new budget field goes through `db/RoolioDatabase.kt`, `BudgetStore.kt`, `Budgets.kt`, `statusToMap` in `RoolioCoreModule.kt`, `RoolioCore.types.ts`, then `src/budgets/types.ts` and `repository.ts`.
- Setting limits (budget 1 min to the period max, ceiling and cap 0–7) are checked in both `src/budgets/rules.ts` and `Budgets.kt`. Keep them in step.
- The pause screen's colors in `res/values*/roolio_pause_colors.xml` copy `src/theme/tokens.ts`. Keep them in step.
- The website's colors in `site/src/styles/tokens.css` also copy `src/theme/tokens.ts`, and its mock-ups in `site/src/components/mock/` copy the Home card and the pause screen. Keep them in step.
- The privacy policy in `site/src/pages/privacy.astro` describes what the app stores, its permissions, Android backups and Google Play. Update it, and its date, when any of those change (for example when billing lands).

### Budget rules

- Available time = own budget + banked time carried in − time used, never below 0. Own budget = budget − what this period repays of earlier borrowing, never below 0.
- Time is spent from the own budget first, then banked time, then borrowed time.
- Periods start at local midnight: every day, on the chosen first day of the week (Monday by default), or on the 1st of the month.
- At reset, leftover time is banked, up to budget × rollover ceiling.
- Borrowing is counted by the minute as time is used. Borrowed time is paid back from the next periods' budgets, nearest first. Time owed can't go above budget × borrow cap, and once it does, the app is blocked until the next reset. Later edits never change minutes already owed.
- Rollover ceiling and borrow cap are counted in periods (any whole number 0–7 for every user, 1 by default). 0 turns each off.
- Edits apply immediately and never change past periods. Changing a budget's period while it owes time needs a `BorrowedChoice`: `clear` or `keep`.
- A notification comes 5 minutes and 1 minute before every pause, only while the app is on screen. A choice on the pause screen counts as warning for the time it gives, so "5 more minutes" gets only the 1-minute alert.
- The pause screen only decides when to stop an app and never changes the numbers. Its choices are "Close app", "5 more minutes" and "Use [next period]'s time".
- Exempt apps are never counted, listed or paused: the dialer, system Settings, launchers and Roolio itself.
- Privacy: all data stays on the device, with no accounts, network or analytics. The only permissions are Usage Access, Display over other apps and notifications (no Accessibility service).

### Not built yet

- Premium: the paywall, the 3-app free limit, and locks on weekly and monthly budgets.
- Group and total-phone budgets. The schema's `kind` column already supports them.
- The history screen. `getHistory()` already exists.
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

The developer builds Google Play releases locally:

```bash
EAS_LOCAL_BUILD_WORKINGDIR=$HOME/.eas-build npx eas-cli@latest build --platform android --profile production --local
```

- `/tmp` is a small RAM disk on the developer's machine, so the working directory is in the home folder instead.
- The build writes `build-<timestamp>.aab` to the project root (ignored by git). That file is what gets uploaded to Play Console.
- EAS keeps the upload key and the version code (`appVersionSource: remote`). Each production build raises `versionCode` by itself. `version` in `app.json` is the version users see, and it's changed by hand.
- The `production` profile builds native code only for `armeabi-v7a` and `arm64-v8a`, which halves build time. Deleting its `env` block brings back `x86` and `x86_64`.

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Code conventions

- Write every change to production quality. Roolio is on Google Play, and any commit can go out to the people using it.
- Don't mention the app's release status in code or comments: no "unreleased", "not shipped yet", "temporary", "for testing" or similar notes.
- Updates install over existing data, so anything Roolio stores on the phone has to carry over:
  - Database: never edit a migration in `RoolioDatabase.kt` once a Play build has it. Append a new one, and check it against a database made by the previous build.
  - Saved preferences (such as the notifications step's "Don't ask again" in `roolio-permissions`): rename or remove a key only with code that moves or clears the old one.
  - Notification channels: Android keeps a channel's importance and sound from when it was first created, so changing them needs a new channel ID, and the old channel deleted.
- Code that ships together (JS, the bridge and Kotlin) needs no compatibility layers. Change or remove it directly.
