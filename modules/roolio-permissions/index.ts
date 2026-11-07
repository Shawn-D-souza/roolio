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

/** Whether the user chose "Don't ask again" for battery use. */
export function hasDeclinedBattery(): boolean {
  return RoolioPermissionsModule.hasDeclinedBattery();
}

export function markBatteryDeclined(): void {
  RoolioPermissionsModule.markBatteryDeclined();
}

/** Whether the welcome screen was finished on this install. */
export function hasSeenWelcome(): boolean {
  return RoolioPermissionsModule.hasSeenWelcome();
}

export function markWelcomeSeen(): void {
  RoolioPermissionsModule.markWelcomeSeen();
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
 * Opens the Settings screen where Roolio's battery use can be set to
 * Unrestricted, and shows `hint` there like `openPermissionSettings`. Unlike
 * it, Roolio doesn't come back by itself if battery use is already
 * unrestricted, because the user is only checking it.
 */
export function openBatterySettings(hint: string): void {
  RoolioPermissionsModule.openBatterySettings(hint);
}
