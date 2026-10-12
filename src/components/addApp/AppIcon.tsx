import { memo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius } from "../../theme/tokens";
import { evictAppIcon, useAppIcon } from "../../hooks/installedApps/useAppIcon";

export const APP_ICON_SIZE = 40;

type AppIconProps = {
  packageName: string;
  appName: string;
  updatedAt: number;
};

export const AppIcon = memo(function AppIcon({
  packageName,
  appName,
  updatedAt,
}: AppIconProps) {
  const { colors } = useAppTheme();
  const uri = useAppIcon(packageName, updatedAt);
  const [failedUri, setFailedUri] = useState<string | null>(null);

  if (uri && uri !== failedUri) {
    return (
      <Image
        source={{ uri }}
        style={styles.icon}
        fadeDuration={0}
        onError={() => {
          // The cached file is gone (e.g. cache cleared); refetch on next mount.
          evictAppIcon(packageName);
          setFailedUri(uri);
        }}
      />
    );
  }

  return (
    <View
      style={[styles.icon, { backgroundColor: colors.surfaceContainerHigh }]}
    >
      <Text style={[styles.initial, { color: colors.onSurfaceVariant }]}>
        {appName.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  icon: {
    width: APP_ICON_SIZE,
    height: APP_ICON_SIZE,
    borderRadius: radius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontSize: 18,
    fontWeight: "600",
  },
});
