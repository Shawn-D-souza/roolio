import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { useAppTheme } from "../../theme/ThemeProvider";
import { space } from "../../theme/tokens";
import { ThemeSelector } from "../../components/settings/ThemeSelector";
import { BatterySetting } from "../../components/settings/BatterySetting";
import { NotificationSetting } from "../../components/settings/NotificationSetting";

const PRIVACY_POLICY_URL = "https://roolio.netlify.app/privacy/";

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const openPrivacyPolicy = () => {
    // Rejects when the phone has no browser. The link stays there to try again.
    Linking.openURL(PRIVACY_POLICY_URL).catch(() => {});
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.onSurface }]}>
            Settings
          </Text>

          <ThemeSelector />
          <NotificationSetting />
          <BatterySetting />
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={openPrivacyPolicy}
            accessibilityRole="link"
            accessibilityHint="Opens in your browser"
            style={styles.privacyLink}
          >
            <Text style={[styles.privacyText, { color: colors.primary }]}>
              Privacy policy
            </Text>
          </Pressable>
          <Text
            style={[styles.versionText, { color: colors.onSurfaceVariant }]}
          >
            Version {version}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    justifyContent: "space-between",
  },
  content: {
    flex: 1,
    paddingBottom: space.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: space.xl,
  },
  footer: {
    alignItems: "center",
  },
  privacyLink: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  privacyText: {
    fontSize: 14,
    fontWeight: "600",
  },
  versionText: {
    fontSize: 14,
    fontWeight: "400",
  },
});
