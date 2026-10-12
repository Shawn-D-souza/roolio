import { memo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { space } from "../../theme/tokens";
import { InstalledApp } from "../../../modules/installed-apps";
import { AppIcon } from "./AppIcon";

export const APP_ROW_HEIGHT = 64;

type AppRowProps = {
  app: InstalledApp;
  onPress: (app: InstalledApp) => void;
};

export const AppRow = memo(function AppRow({ app, onPress }: AppRowProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={() => onPress(app)}
      android_ripple={{ color: colors.surfaceContainerHighest }}
      accessibilityRole="button"
      accessibilityLabel={app.appName}
      style={styles.row}
    >
      <AppIcon
        packageName={app.packageName}
        appName={app.appName}
        updatedAt={app.updatedAt}
      />
      <Text
        style={[styles.name, { color: colors.onSurface }]}
        numberOfLines={1}
      >
        {app.appName}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    height: APP_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.lg,
    gap: space.lg,
  },
  name: {
    flex: 1,
    fontSize: 16,
  },
});
