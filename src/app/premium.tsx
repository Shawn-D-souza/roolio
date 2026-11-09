import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useAppTheme } from "../theme/ThemeProvider";
import { radius, space } from "../theme/tokens";
import { useReduceMotion } from "../hooks/useReduceMotion";
import { usePremium } from "../premium/PremiumProvider";
import { FREE_APP_LIMIT, type PremiumFeature } from "../premium/plan";
import { HERO_OVERLAP, PremiumHero } from "../components/premium/PremiumHero";
import { PlanComparison } from "../components/premium/PlanComparison";
import { EarlyAccessNote } from "../components/premium/EarlyAccessNote";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { TextButton } from "../components/ui/TextButton";

const APPEAR_MS = 900;

// What a lock was guarding, said above the comparison.
const LOCKED: Record<PremiumFeature, string> = {
  apps: `Budgeting more than ${FREE_APP_LIMIT} apps comes with Premium`,
  periods: "Weekly and monthly budgets come with Premium",
  stats: "Stats come with Premium",
};

function isFeature(value: string | undefined): value is PremiumFeature {
  return value !== undefined && value in LOCKED;
}

function close() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace("/");
  }
}

export default function PremiumScreen() {
  const { colors } = useAppTheme();
  const { isPremium, setPremium } = usePremium();
  const reduceMotion = useReduceMotion();
  const params = useLocalSearchParams<{ feature?: string }>();
  const highlight =
    !isPremium && isFeature(params.feature) ? params.feature : undefined;
  // One clock for everything that moves in as the screen opens.
  const [appear] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduceMotion) {
      appear.setValue(1);
      return;
    }
    const animation = Animated.timing(appear, {
      toValue: 1,
      duration: APPEAR_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [appear, reduceMotion]);

  const choose = (on: boolean) => {
    setPremium(on);
    close();
  };

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* The hero is dark in both themes. */}
      <StatusBar style="light" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PremiumHero isPremium={isPremium} onClose={close} appear={appear} />

        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {highlight && (
            <View style={styles.locked}>
              <MaterialIcons
                name="lock-open"
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.lockedText, { color: colors.onSurface }]}>
                {LOCKED[highlight]}
              </Text>
            </View>
          )}

          <PlanComparison highlight={highlight} appear={appear} />

          <EarlyAccessNote isPremium={isPremium} />
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.outlineVariant,
          },
        ]}
      >
        {isPremium ? (
          <>
            <PrimaryButton label="Done" onPress={close} />
            <TextButton
              variant="subtle"
              label="Switch to Free"
              onPress={() => choose(false)}
            />
          </>
        ) : (
          <>
            <Text style={[styles.reassure, { color: colors.onSurfaceVariant }]}>
              No payment or account needed
            </Text>
            <PrimaryButton
              label="Get Premium free"
              onPress={() => choose(true)}
            />
            <TextButton
              variant="subtle"
              label="Stay on Free"
              onPress={() => choose(false)}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  sheet: {
    flexGrow: 1,
    marginTop: -HERO_OVERLAP,
    borderTopLeftRadius: radius.extraLarge,
    borderTopRightRadius: radius.extraLarge,
    paddingHorizontal: space.lg,
    paddingTop: space.xl,
    paddingBottom: space.xl,
    gap: space.lg,
  },
  // Lined up with the icons in the comparison under it.
  locked: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg + 1,
  },
  lockedText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  bottomBar: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    gap: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  reassure: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: space.xs,
  },
});
