import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { space, radius } from "../../theme/tokens";

type PermissionSettingProps = {
  sectionTitle: string;
  on: boolean;
  offIcon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  body: string;
  accessibilityHint: string;
  onPress: () => void | Promise<void>;
};

// Always shown, so the user can check the setting again after changing it.
export function PermissionSetting({
  sectionTitle,
  on,
  offIcon,
  title,
  body,
  accessibilityHint,
  onPress,
}: PermissionSettingProps) {
  const { colors } = useAppTheme();
  const [busy, setBusy] = useState(false);

  const handlePress = async () => {
    setBusy(true);
    try {
      await onPress();
    } catch {
      // The card keeps showing the real status, so the user can try again.
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
        {sectionTitle}
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
          onPress={handlePress}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={`${title} ${body}`}
          accessibilityHint={accessibilityHint}
          android_ripple={{ color: colors.surfaceContainerHighest }}
          style={styles.row}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: on
                  ? colors.primaryContainer
                  : colors.lowContainer,
              },
            ]}
          >
            <MaterialIcons
              name={on ? "check" : offIcon}
              size={22}
              color={on ? colors.onPrimaryContainer : colors.onLowContainer}
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
