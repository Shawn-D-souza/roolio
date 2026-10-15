export type PermissionStatus = {
  /** Usage Access: measures time spent in each app. */
  usageAccess: boolean;
  /** Display over other apps: shows the pause screen. */
  overlay: boolean;
  /** Always true below Android 13, where notifications need no permission. */
  notifications: boolean;
};

export type PermissionName = keyof PermissionStatus;

export type NotificationPermission = {
  granted: boolean;
  /** False once Android stops showing the dialog; only Settings can grant it then. */
  canAskAgain: boolean;
};
