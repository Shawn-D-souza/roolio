import { openPermissionSettings } from "../../../modules/roolio-permissions";
import { usePermissions } from "../../permissions/PermissionsProvider";
import { BATTERY_SETTINGS_HINT } from "../../permissions/steps";
import { PermissionSetting } from "./PermissionSetting";

export function BatterySetting() {
  const { status } = usePermissions();
  const unrestricted = status.batteryUnrestricted;

  return (
    <PermissionSetting
      sectionTitle="Battery"
      on={unrestricted}
      offIcon="battery-alert"
      title={
        unrestricted
          ? "Battery use: Unrestricted"
          : "Pause screen not showing up?"
      }
      body={
        unrestricted
          ? "Your phone won't block the pause screen to save battery."
          : "Some phones block it to save battery. Set Roolio's battery use to Unrestricted."
      }
      accessibilityHint="Opens battery settings"
      onPress={() =>
        openPermissionSettings("batteryUnrestricted", BATTERY_SETTINGS_HINT)
      }
    />
  );
}
