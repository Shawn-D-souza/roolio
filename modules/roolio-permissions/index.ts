import RoolioPermissionsModule from "./src/RoolioPermissionsModule";
import {
  NotificationPermission,
  PermissionName,
  PermissionStatus,
} from "./src/RoolioPermissions.types";

export type { NotificationPermission, PermissionName, PermissionStatus };

export function getPermissionStatus(): PermissionStatus {
  return RoolioPermissionsModule.getStatus();
}

/** Whether Usage Access and Display over other apps were ever both granted. */
export function hasCompletedSetup(): boolean {
  return RoolioPermissionsModule.hasCompletedSetup();
}

export function markSetupCompleted(): void {
  RoolioPermissionsModule.markSetupCompleted();
}

/** Whether the user chose "Don't ask again" for notifications. */
export function hasDeclinedNotifications(): boolean {
  return RoolioPermissionsModule.hasDeclinedNotifications();
}

export function markNotificationsDeclined(): void {
  RoolioPermissionsModule.markNotificationsDeclined();
}

export function getNotificationPermissionAsync(): Promise<NotificationPermission> {
  return RoolioPermissionsModule.getNotificationPermissionAsync();
}

export function requestNotificationPermissionAsync(): Promise<NotificationPermission> {
  return RoolioPermissionsModule.requestNotificationPermissionAsync();
}

/**
 * Opens the Settings screen that grants `permission` and shows `hint` there as
 * a short system message. Roolio returns to the front once it's granted, where
 * Android allows it; otherwise the user comes back with Back.
 */
export function openPermissionSettings(
  permission: PermissionName,
  hint: string,
): void {
  RoolioPermissionsModule.openSettings(permission, hint);
}

/**
 * Whether Roolio is exempt from battery optimization. Some phones stop its
 * tracking to save battery otherwise, and apps then aren't counted or paused.
 */
export function isBatteryUnrestricted(): boolean {
  return RoolioPermissionsModule.isBatteryUnrestricted();
}

/**
 * Opens the Settings screen where Roolio's battery use can be set to
 * Unrestricted, and shows `hint` there like `openPermissionSettings`.
 */
export function openBatterySettings(hint: string): void {
  RoolioPermissionsModule.openBatterySettings(hint);
}
