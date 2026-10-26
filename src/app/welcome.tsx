import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../theme/ThemeProvider";
import { space } from "../theme/tokens";
import { usePermissions } from "../permissions/PermissionsProvider";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { useStoryClock } from "../components/welcome/storyClock";
import { StoryPicture } from "../components/welcome/StoryPicture";
import { StorySteps } from "../components/welcome/StorySteps";

/**
 * The first screen of a new install, seen once before setup. A short loop
 * shows the idea, and three lines name each part of it as it plays. Laid
 * out like the setup screens after it, so the flow reads as one.
 */
export default function WelcomeScreen() {
  const { colors } = useAppTheme();
  const { finishWelcome } = usePermissions();
  const clock = useStoryClock();

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      {/* Scrolls only at large font sizes. */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <StoryPicture clock={clock} />

        {/* Banked and borrowed in the picture's colors. The words say it
            too, so color is never the only signal. */}
        <Text
          style={[styles.title, { color: colors.onSurface }]}
          accessibilityRole="header"
        >
          App time you can <Text style={{ color: colors.banked }}>bank</Text>{" "}
          and <Text style={{ color: colors.borrowed }}>borrow</Text>
        </Text>

        <StorySteps clock={clock} />
      </ScrollView>

      <View style={styles.actions}>
        <PrimaryButton label="Get started" onPress={finishWelcome} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: space.xl,
    paddingVertical: space.xl,
    gap: space.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
    textAlign: "center",
  },
  actions: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
});
