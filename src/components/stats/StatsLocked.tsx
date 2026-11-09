import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { openPremium } from "../../premium/plan";
import { PrimaryButton } from "../ui/PrimaryButton";

// Stats without Premium: what it would show, and the way to unlock it.
export function StatsLocked() {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.primaryContainer },
          ]}
        >
          <MaterialIcons
            name="insights"
            size={36}
            color={colors.onPrimaryContainer}
          />
          <View
            style={[
              styles.lock,
              {
                backgroundColor: colors.onSurface,
                borderColor: colors.background,
              },
            ]}
          >
            <MaterialIcons name="lock" size={14} color={colors.background} />
          </View>
        </View>
        <Text
          style={[styles.headline, { color: colors.onSurface }]}
          accessibilityRole="header"
        >
          Stats come with Premium
        </Text>
        <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
          See where your time goes by day, week and month, and what you banked
          and borrowed. Premium is free during early access.
        </Text>
        <View style={styles.button}>
          <PrimaryButton
            label="See Premium"
            onPress={() => openPremium("stats")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
    gap: space.md,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.sm,
  },
  lock: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  headline: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 420,
  },
  button: {
    alignSelf: "stretch",
    marginTop: space.md,
  },
});
