import { Image, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";

/**
 * Small, non-interactive previews of what each permission unlocks. They use
 * Roolio's own styling because they show Roolio's own screens. Sample data
 * uses a made-up "Videos" app so no real brand appears.
 */

const SAMPLE_APP = "Videos";

const roolioIcon = require("../../../assets/icon.png");

/** A system notification, on a Roolio-tinted backdrop. */
export function NotificationPreview() {
  const { colors } = useAppTheme();
  return (
    <View
      style={[
        styles.notificationBackdrop,
        {
          backgroundColor: colors.surfaceContainer,
          borderColor: colors.outlineVariant,
        },
      ]}
      accessible
      accessibilityLabel={`Example notification: 5 minutes left on ${SAMPLE_APP}`}
    >
      <View
        style={[
          styles.notification,
          {
            backgroundColor: colors.surface,
            borderColor: colors.outlineVariant,
          },
        ]}
      >
        <Image source={roolioIcon} style={styles.notificationIcon} />
        <View style={styles.notificationBody}>
          <Text
            style={[styles.notificationApp, { color: colors.onSurfaceVariant }]}
          >
            Roolio · now
          </Text>
          <Text style={[styles.notificationTitle, { color: colors.onSurface }]}>
            5 minutes left on {SAMPLE_APP}
          </Text>
          <Text
            style={[
              styles.notificationText,
              { color: colors.onSurfaceVariant },
            ]}
          >
            Wrap up, or borrow more time when it runs out.
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.notificationGhost,
          {
            backgroundColor: colors.surface,
            borderColor: colors.outlineVariant,
          },
        ]}
      />
    </View>
  );
}

const PREVIEW_HEIGHT = 176;

const styles = StyleSheet.create({
  notificationBackdrop: {
    height: PREVIEW_HEIGHT,
    borderRadius: radius.large,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  notification: {
    flexDirection: "row",
    gap: space.md,
    borderRadius: radius.large,
    borderWidth: 1,
    padding: space.md,
    zIndex: 1,
    elevation: 2,
  },
  notificationIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
  },
  notificationBody: {
    flex: 1,
    gap: 2,
  },
  notificationApp: {
    fontSize: 12,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  notificationText: {
    fontSize: 13,
    lineHeight: 18,
  },
  // A second notification peeking out below, so it reads as a shade.
  notificationGhost: {
    height: 14,
    marginHorizontal: space.lg,
    marginTop: -4,
    borderBottomLeftRadius: radius.medium,
    borderBottomRightRadius: radius.medium,
    borderWidth: 1,
    borderTopWidth: 0,
  },
});
