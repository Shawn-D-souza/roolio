import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { usePremium } from "../../premium/PremiumProvider";
import { FREE_APP_LIMIT, openPremium } from "../../premium/plan";

// Whether Premium is on, and the way to turn it on or off.
export function PremiumSetting() {
  const { colors } = useAppTheme();
  const { isPremium } = usePremium();
  const title = isPremium ? "Premium: On" : "Premium: Off";
  const body = isPremium
    ? "Free during early access."
    : `Up to ${FREE_APP_LIMIT} apps, daily budgets only, and no Stats. Premium is free during early access.`;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
        Premium
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
          onPress={() => openPremium()}
          accessibilityRole="button"
          accessibilityLabel={`${title} ${body}`}
          android_ripple={{ color: colors.surfaceContainerHighest }}
          style={styles.row}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isPremium
                  ? colors.primaryContainer
                  : colors.surfaceContainerHighest,
              },
            ]}
          >
            <MaterialIcons
              name="workspace-premium"
              size={22}
              color={
                isPremium ? colors.onPrimaryContainer : colors.onSurfaceVariant
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
