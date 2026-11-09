import { useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";

const BADGE = 56;
const GLOW = 84;
const TOP_BAR = 56;
// How far the sheet under the hero overlaps it.
export const HERO_OVERLAP = space.xl;

type PremiumHeroProps = {
  isPremium: boolean;
  onClose: () => void;
  // 0 to 1 as the screen first appears.
  appear: Animated.Value;
};

// The top of the Premium screen: a deep indigo gradient with a glowing gold
// badge, running up behind the status bar.
export function PremiumHero({ isPremium, onClose, appear }: PremiumHeroProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  // The gradient is drawn at the hero's measured size, so it always fills it.
  const [size, setSize] = useState({ width: 0, height: 0 });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) =>
      current.width === width && current.height === height
        ? current
        : { width, height },
    );
  };

  const badgeIn = {
    opacity: appear.interpolate({
      inputRange: [0, 0.4],
      outputRange: [0, 1],
      extrapolate: "clamp",
    }),
    transform: [
      {
        scale: appear.interpolate({
          inputRange: [0, 0.6],
          outputRange: [0.6, 1],
          extrapolate: "clamp",
        }),
      },
    ],
  };
  // The glow opens out behind the badge as it arrives, then holds still.
  const glow = {
    opacity: appear.interpolate({
      inputRange: [0.2, 0.8],
      outputRange: [0, 0.22],
      extrapolate: "clamp",
    }),
    transform: [
      {
        scale: appear.interpolate({
          inputRange: [0.2, 0.8],
          outputRange: [0.7, 1],
          extrapolate: "clamp",
        }),
      },
    ],
  };

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: HERO_OVERLAP + space.lg },
      ]}
    >
      {size.height > 0 && (
        <Svg
          style={StyleSheet.absoluteFill}
          width={size.width}
          height={size.height}
        >
          <Defs>
            <LinearGradient id="premiumHero" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.premiumHeroTop} />
              <Stop offset="1" stopColor={colors.premiumHeroBottom} />
            </LinearGradient>
          </Defs>
          <Rect
            width={size.width}
            height={size.height}
            fill="url(#premiumHero)"
          />
        </Svg>
      )}
      {size.height === 0 && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.premiumHeroTop },
          ]}
        />
      )}

      {/* Close on the left, the pill centered on the screen. */}
      <View style={styles.topBar}>
        <View style={styles.pillSlot} pointerEvents="none">
          <View style={styles.pill}>
            <Text style={[styles.pillLabel, { color: colors.onPremiumHero }]}>
              EARLY ACCESS
            </Text>
          </View>
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={space.sm}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={styles.iconButton}
        >
          <MaterialIcons name="close" size={24} color={colors.onPremiumHero} />
        </Pressable>
      </View>

      <View
        style={styles.badgeArea}
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View
          style={[styles.glow, { backgroundColor: colors.premiumGold }, glow]}
        />
        <Animated.View
          style={[
            styles.badge,
            { backgroundColor: colors.premiumGold },
            badgeIn,
          ]}
        >
          <MaterialIcons
            name={isPremium ? "verified" : "workspace-premium"}
            size={32}
            color={colors.onPremiumGold}
          />
        </Animated.View>
      </View>

      <View style={styles.text}>
        <Text
          style={[styles.title, { color: colors.onPremiumHero }]}
          accessibilityRole="header"
        >
          {isPremium ? "You have Premium" : "Roolio Premium"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.onPremiumHeroVariant }]}>
          {isPremium
            ? "Every feature is yours, free during early access."
            : "Every feature, free during early access."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  topBar: {
    height: TOP_BAR,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.xs,
  },
  pillSlot: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeArea: {
    height: GLOW,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: GLOW,
    height: GLOW,
    borderRadius: radius.full,
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  text: {
    alignItems: "center",
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    gap: space.xs,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 340,
  },
});
