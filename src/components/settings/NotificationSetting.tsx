import { Platform } from "react-native";
import {
  getNotificationPermissionAsync,
  openPermissionSettings,
  requestNotificationPermissionAsync,
} from "../../../modules/roolio-permissions";
import { usePermissions } from "../../permissions/PermissionsProvider";
import { NOTIFICATIONS_SETTINGS_HINT } from "../../permissions/steps";
import { PermissionSetting } from "./PermissionSetting";

// Below Android 13 there's no permission to report or ask for.
const NOTIFICATIONS_NEED_PERMISSION =
  Platform.OS === "android" && Platform.Version >= 33;

export function NotificationSetting() {
  const { status, refresh } = usePermissions();
  const on = status.notifications;

  if (!NOTIFICATIONS_NEED_PERMISSION) return null;

  const handlePress = async () => {
    if (on) {
      openPermissionSettings("notifications", "");
      return;
    }
    // Once Android stops showing the dialog, only Settings can turn it on.
    const { canAskAgain } = await getNotificationPermissionAsync();
    if (!canAskAgain) {
      openPermissionSettings("notifications", NOTIFICATIONS_SETTINGS_HINT);
      return;
    }
    await requestNotificationPermissionAsync();
    refresh();
  };

  return (
    <PermissionSetting
      sectionTitle="Notifications"
      on={on}
      offIcon="notifications-off"
      title={on ? "Notifications: On" : "Notifications are off"}
      body={
        on
          ? "You'll get a heads-up 5 minutes and 1 minute before an app is paused."
          : "Turn them on to get a heads-up 5 minutes and 1 minute before an app is paused."
      }
      accessibilityHint={
        on ? "Opens notification settings" : "Turns on notifications"
      }
      onPress={handlePress}
    />
  );
}
