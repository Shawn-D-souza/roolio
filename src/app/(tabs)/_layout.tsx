import { StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius } from "../../theme/tokens";
import { rememberTab } from "../../../modules/roolio-core";
import { usePremium } from "../../premium/PremiumProvider";
import { LockBadge } from "../../components/ui/LockBadge";

export default function TabLayout() {
  const { colors } = useAppTheme();
  const { isPremium } = usePremium();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "none",
        freezeOnBlur: true,
        lazy: true,
        sceneStyle: {
          backgroundColor: colors.background,
        },
        tabBarActiveTintColor: colors.onSurface,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.surfaceContainer,
          borderTopColor: colors.outlineVariant,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        listeners={{ focus: () => rememberTab("home") }}
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && { backgroundColor: colors.primaryContainer },
              ]}
            >
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={22}
                color={
                  focused ? colors.onPrimaryContainer : colors.onSurfaceVariant
                }
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        // A locked Stats isn't worth reopening on.
        listeners={{
          focus: () => {
            if (isPremium) rememberTab("stats");
          },
        }}
        options={{
          title: "Stats",
          tabBarAccessibilityLabel: isPremium ? "Stats" : "Stats, needs Premium",
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && { backgroundColor: colors.primaryContainer },
              ]}
            >
              {/* Wrapped so the lock sits on the icon's corner. */}
              <View>
                <Ionicons
                  name={focused ? "stats-chart" : "stats-chart-outline"}
                  size={22}
                  color={
                    focused
                      ? colors.onPrimaryContainer
                      : colors.onSurfaceVariant
                  }
                />
                {!isPremium && (
                  <LockBadge
                    ringColor={
                      focused
                        ? colors.primaryContainer
                        : colors.surfaceContainer
                    }
                  />
                )}
              </View>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconContainer,
                focused && { backgroundColor: colors.primaryContainer },
              ]}
            >
              <Ionicons
                name={focused ? "settings" : "settings-outline"}
                size={22}
                color={
                  focused ? colors.onPrimaryContainer : colors.onSurfaceVariant
                }
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 52,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
