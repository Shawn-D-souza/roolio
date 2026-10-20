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
  MockScreen,
  MockSwitchPage,
} from "../components/permissions/SystemMock";

type StepBase = {
  required: boolean;
  // Shown as a short system message on top of Settings.
  settingsHint: string;
  // Shown after the user comes back without turning it on.
  stillOffHint: string;
};

// Why and how on two screens; see GuidedPermissionStep.
export type GuidedStep = StepBase & GuidedStepContent & { layout: "guided" };

// One screen with a single action. Used for notifications, where Android's own
// dialog explains itself and no how-to is needed.
export type ClassicStep = StepBase & {
  layout: "classic";
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

// Below Android 13 notifications need no permission, so the step is skipped.
const NOTIFICATIONS_NEED_PERMISSION =
  Platform.OS === "android" && Platform.Version >= 33;

export const PERMISSION_STEPS: PermissionName[] = NOTIFICATIONS_NEED_PERMISSION
  ? ["usageAccess", "overlay", "notifications"]
  : ["usageAccess", "overlay"];

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

    case "notifications":
      return {
        layout: "classic",
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
        settingsHint: "Turn on notifications for Roolio",
        stillOffHint: canAskNotifications
          ? "Notifications are off. You can turn them on any time."
          : "Notifications are still off. You can turn them on any time.",
      };
  }
}
