import { NativeModule, requireNativeModule } from 'expo';
import {
  NotificationPermission,
  PermissionName,
  PermissionStatus,
} from './RoolioPermissions.types';

declare class RoolioPermissionsModule extends NativeModule<{}> {
  getStatus(): PermissionStatus;
  hasCompletedSetup(): boolean;
  markSetupCompleted(): void;
  hasDeclinedNotifications(): boolean;
  markNotificationsDeclined(): void;
  getNotificationPermissionAsync(): Promise<NotificationPermission>;
  requestNotificationPermissionAsync(): Promise<NotificationPermission>;
  openSettings(permission: PermissionName, hint: string): void;
  isBatteryUnrestricted(): boolean;
  openBatterySettings(hint: string): void;
}

export default requireNativeModule<RoolioPermissionsModule>('RoolioPermissions');
