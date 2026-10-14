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
  size?: number;
};

export const AppIcon = memo(function AppIcon({
  packageName,
  appName,
  updatedAt,
  size = APP_ICON_SIZE,
}: AppIconProps) {
  const { colors } = useAppTheme();
  const uri = useAppIcon(packageName, updatedAt);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  // Keep the corner radius proportional at every size.
  const sizeStyle = {
    width: size,
    height: size,
    borderRadius: (radius.medium * size) / APP_ICON_SIZE,
  };

  if (uri && uri !== failedUri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.icon, sizeStyle]}
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
      style={[
        styles.icon,
        sizeStyle,
        { backgroundColor: colors.surfaceContainerHigh },
      ]}
    >
      <Text
        style={[
          styles.initial,
          { color: colors.onSurfaceVariant, fontSize: size * 0.45 },
        ]}
      >
        {appName.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  icon: {
    alignItems: "center",
    justifyContent: "center",
  },
  initial: {
    fontWeight: "600",
  },
});
