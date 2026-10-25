import { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  isBatteryUnrestricted,
  openBatterySettings,
} from "../../../modules/roolio-permissions";
import { useAppTheme } from "../../theme/ThemeProvider";
import { space, radius } from "../../theme/tokens";

// Android 12 moved battery use onto the app's info page.
const SETTINGS_HINT =
  Platform.OS === "android" && Platform.Version >= 31
    ? "Tap Battery, then choose Unrestricted"
    : "Choose All apps, find Roolio, then choose Don't optimize";

// Always shown, so the user can check the setting again after changing it.
export function BatterySetting() {
  const { colors } = useAppTheme();
  const [unrestricted, setUnrestricted] = useState(isBatteryUnrestricted);

  // The setting is changed in Settings, outside the app.
  const refresh = useCallback(
    () => setUnrestricted(isBatteryUnrestricted()),
    [],
  );
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const title = unrestricted
    ? "Battery use: Unrestricted"
    : "Pause screen not showing up?";
  const body = unrestricted
    ? "Your phone won't block the pause screen to save battery."
    : "Some phones block it to save battery. Set Roolio's battery use to Unrestricted.";

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
        Battery
      </Text>

      {/* Android ripples ignore borderRadius on the Pressable itself, so a
          rounded wrapper clips the ripple to the card. */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceContainer,
            borderColor: colors.outlineVariant,
          },
        ]}
      >
        <Pressable
          onPress={() => openBatterySettings(SETTINGS_HINT)}
          accessibilityRole="button"
          accessibilityLabel={`${title} ${body}`}
          accessibilityHint="Opens battery settings"
          android_ripple={{ color: colors.surfaceContainerHighest }}
          style={styles.row}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: unrestricted
                  ? colors.primaryContainer
                  : colors.lowContainer,
              },
            ]}
          >
            <MaterialIcons
              name={unrestricted ? "check" : "battery-alert"}
              size={22}
              color={
                unrestricted ? colors.onPrimaryContainer : colors.onLowContainer
              }
            />
          </View>
          <View style={styles.text}>
            <Text style={[styles.title, { color: colors.onSurface }]}>
              {title}
            </Text>
            <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
              {body}
            </Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={24}
            color={colors.onSurfaceVariant}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: space.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: space.md,
    marginLeft: space.xs,
  },
  card: {
    borderRadius: radius.large,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: space.lg,
    gap: space.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
    gap: space.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
});
