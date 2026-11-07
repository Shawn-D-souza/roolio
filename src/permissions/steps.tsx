import { ReactNode } from "react";
import { Platform } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import type { PermissionName } from "../../modules/roolio-permissions";
import { NotificationPreview } from "../components/permissions/FeaturePreviews";
import { OverlayIllustration } from "../components/permissions/OverlayIllustration";
import type { GuidedStepContent } from "../components/permissions/GuidedPermissionStep";
import type { NumberedStep } from "../components/permissions/NumberedSteps";
import { UsageAccessIllustration } from "../components/permissions/UsageAccessIllustration";
import {
  MockAppRow,
  MockChoicePage,
  MockScreen,
  MockSwitchPage,
} from "../components/permissions/SystemMock";
import type { OptionalPermission } from "./PermissionsProvider";

type StepBase = {
  required: boolean;
  // Shown as a short system message on top of Settings.
  settingsHint: string;
  // Shown after the user comes back without turning it on.
  stillOffHint: string;
};

// Why and how on two screens; see GuidedPermissionStep.
export type GuidedStep = StepBase & GuidedStepContent & { layout: "guided" };

// One screen with a single action, for the steps a user can skip. No how-to is
// needed: Android's notification dialog explains itself, and the battery step
// has one short thing to choose.
export type ClassicStep = StepBase & {
  layout: "classic";
  permission: OptionalPermission;
  illustration: ReactNode;
  title: string;
  body: string;
  // One short line that answers the user's main worry.
  note: { icon: keyof typeof MaterialIcons.glyphMap; text: string };
  actionLabel: string;
  // True when the action leaves Roolio for a Settings screen.
  opensSettings: boolean;
};

export type PermissionStepContent = GuidedStep | ClassicStep;

type StepOptions = {
  // The permission was granted before and has since been turned off.
  returning: boolean;
  // Whether Android will still show the notification dialog.
  canAskNotifications: boolean;
};

// A new user isn't shown the notifications step; see PermissionsProvider.
export const FIRST_SETUP_STEPS: PermissionName[] = [
  "usageAccess",
  "overlay",
  "batteryUnrestricted",
];

export const PERMISSION_STEPS: PermissionName[] = [
  ...FIRST_SETUP_STEPS,
  "notifications",
];

// Android 12 moved battery use onto the app's info page.
const BATTERY_ON_APP_PAGE = Platform.OS === "android" && Platform.Version >= 31;

const BATTERY_CHOICES = BATTERY_ON_APP_PAGE
  ? ["Unrestricted", "Optimized", "Restricted"]
  : ["Don't optimize", "Optimize"];

export const NOTIFICATIONS_SETTINGS_HINT = "Turn on notifications for Roolio";

export const BATTERY_SETTINGS_HINT = BATTERY_ON_APP_PAGE
  ? "Tap Battery, then choose Unrestricted"
  : "Choose All apps, find Roolio, then choose Don't optimize";

// Steps for permissions granted from a list of apps in Settings.
function listSteps(screenTitle: string, switchLabel: string): NumberedStep[] {
  return [
    {
      text: "Find Roolio in the list and tap it",
      sketch: (
        <MockScreen title={screenTitle}>
          <MockAppRow />
          <MockAppRow roolio subtitle="Not allowed" />
          <MockAppRow />
        </MockScreen>
      ),
    },
    {
      text: `Turn on “${switchLabel}”`,
      sketch: <MockSwitchPage title={screenTitle} switchLabel={switchLabel} />,
    },
    { text: "Come back to Roolio" },
  ];
}

export function getStepContent(
  step: PermissionName,
  { returning, canAskNotifications }: StepOptions,
): PermissionStepContent {
  switch (step) {
    case "usageAccess":
      return {
        layout: "guided",
        required: true,
        settingsHint: "Find Roolio and turn on usage access",
        stillOffHint:
          "Usage Access is still off. Roolio can't count your app time until it's on.",
        intro: {
          illustration: <UsageAccessIllustration />,
          ...(returning
            ? {
                title: "Usage Access is off",
                body: "Roolio can't count your app time, so your budgets are paused. Your banked time and borrowed days are safe.",
              }
            : {
                title: "Allow Usage Access",
                body: "Roolio uses it to keep track of your budgets.",
              }),
          highlightsTitle: "Your data always stays",
          highlights: [
            { icon: "lock-outline", label: "Private" },
            { icon: "cloud-off", label: "Offline" },
            { icon: "smartphone", label: "On this phone" },
          ],
        },
        learnMore: {
          title: "About Usage Access",
          faqs: [
            {
              question: "What does Roolio see?",
              answer:
                "Which apps you open, and for how long. That's all Usage Access shares with any app.",
            },
            {
              question: "What can't Roolio see?",
              answer:
                "Your messages, photos, passwords, or anything on your screen. Usage Access doesn't allow it.",
            },
            {
              question: "Where does my data go?",
              answer:
                "Nowhere. It stays on this phone. Roolio has no account and no servers, and your data is deleted if you uninstall Roolio.",
            },
            {
              question: "Can I turn it off later?",
              answer:
                "Yes, any time in Settings. Your budgets pause until it's back on, and nothing is lost.",
            },
          ],
        },
        guide: {
          title: "How to turn on Usage Access",
          tip: "Some phones call this “Usage data access”. If Roolio's page opens straight away, skip to step 2.",
          steps: listSteps("Usage access", "Permit usage access"),
        },
      };

    case "overlay":
      return {
        layout: "guided",
        required: true,
        settingsHint: "Find Roolio and turn on display over other apps",
        stillOffHint:
          "Display over other apps is still off. Roolio can't pause apps until it's on.",
        intro: {
          illustration: <OverlayIllustration />,
          ...(returning
            ? {
                title: "Display over other apps is off",
                body: "Roolio can't pause apps when their time runs out. Your budgets, banked time, and borrowed days are safe.",
              }
            : {
                title: "Allow display over other apps",
                body: "Roolio uses it to show its pause screen.",
              }),
          highlightsTitle: "The pause screen",
          highlights: [
            {
              icon: "pause-circle-outline",
              label: "Only appears when time's up",
            },
            { icon: "block", label: "Never shows ads" },
            { icon: "visibility-off", label: "Can't see other apps" },
          ],
        },
        learnMore: {
          title: "About display over other apps",
          faqs: [
            {
              question: "What does this let Roolio do?",
              answer:
                "Show its pause screen on top of the app you're using, when that app's time runs out.",
            },
            {
              question: "When will I see it?",
              answer:
                "Only when an app's budget reaches zero, as you open it or while you're using it. Never at any other time.",
            },
            {
              question: "Can Roolio see my other apps?",
              answer:
                "No. It can't read or change anything in other apps. It only shows Roolio's own screen.",
            },
            {
              question: "Can I turn it off later?",
              answer:
                "Yes, any time in Settings. Apps won't pause until it's back on, and your budgets are kept.",
            },
          ],
        },
        guide: {
          title: "How to turn on display over other apps",
          tip: "Some phones call this “Appear on top”. If Roolio's page opens straight away, skip to step 2.",
          steps: listSteps(
            "Display over other apps",
            "Allow display over other apps",
          ),
        },
      };

    case "batteryUnrestricted":
      return {
        layout: "classic",
        permission: "batteryUnrestricted",
        required: false,
        illustration: (
          <MockChoicePage
            title={
              BATTERY_ON_APP_PAGE ? "App battery usage" : "Battery optimization"
            }
            choices={BATTERY_CHOICES}
          />
        ),
        title: "Keep Roolio running",
        body: `Some phones stop Roolio to save battery, so apps don't get counted or paused. Choose “${BATTERY_CHOICES[0]}” to keep it running.`,
        note: {
          icon: "battery-full",
          text: "Roolio only checks your apps while your screen is on.",
        },
        actionLabel: "Open battery settings",
        opensSettings: true,
        settingsHint: BATTERY_SETTINGS_HINT,
        stillOffHint: `Battery use isn't set to “${BATTERY_CHOICES[0]}” yet. You can change it any time from Roolio's Settings tab.`,
      };

    case "notifications":
      return {
        layout: "classic",
        permission: "notifications",
        required: false,
        illustration: <NotificationPreview />,
        title: "Know before time runs out",
        body: "Get a heads-up 5 minutes and 1 minute before an app is paused, so you can wrap up instead of being cut off.",
        note: {
          icon: "notifications-none",
          text: "Only alerts about your budgets. Never ads.",
        },
        // Once Android stops showing the dialog, only Settings can turn it on.
        actionLabel: canAskNotifications
          ? "Allow notifications"
          : "Turn on in Settings",
        opensSettings: !canAskNotifications,
        settingsHint: NOTIFICATIONS_SETTINGS_HINT,
        stillOffHint: canAskNotifications
          ? "Notifications are off. You can turn them on any time."
          : "Notifications are still off. You can turn them on any time.",
      };
  }
}
