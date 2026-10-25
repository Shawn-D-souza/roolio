import { StyleSheet, Text, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { useAppTheme } from "../../theme/ThemeProvider";
import { space } from "../../theme/tokens";
import { ThemeSelector } from "../../components/settings/ThemeSelector";
import { BatterySetting } from "../../components/settings/BatterySetting";

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const version = Constants.expoConfig?.version ?? "1.0.0";

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
          <BatterySetting />
        </View>

        <View style={styles.footer}>
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
  versionText: {
    fontSize: 14,
    fontWeight: "400",
  },
});
