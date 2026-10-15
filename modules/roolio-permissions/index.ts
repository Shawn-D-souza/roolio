import RoolioPermissionsModule from './src/RoolioPermissionsModule';
import {
  NotificationPermission,
  PermissionName,
  PermissionStatus,
} from './src/RoolioPermissions.types';

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
export function openPermissionSettings(permission: PermissionName, hint: string): void {
  RoolioPermissionsModule.openSettings(permission, hint);
}
