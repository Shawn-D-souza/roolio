import { ReactNode } from "react";
import { Image, StyleSheet, Text, useColorScheme, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";

/**
 * Sketches of Android's own Settings screens.
 *
 * These deliberately do NOT use Roolio's tokens: they show a screen outside
 * Roolio, and must look like what the user will actually see there. Colors
 * are a neutral take on stock Android and follow the phone's system theme
 * (not the in-app theme choice), since Settings follows the system theme.
 * The only Roolio color is the highlight ring, which is our annotation on
 * top of the sketch, not part of it.
 */
const systemColors = {
  light: {
    screen: "#FFFFFF",
    frame: "#C4C7C5",
    text: "#1F1F1F",
    secondary: "#5E5E5E",
    placeholder: "#E3E3E3",
    switchOn: "#0B57D0",
    switchOnThumb: "#FFFFFF",
  },
  dark: {
    screen: "#1B1B1B",
    frame: "#444746",
    text: "#E3E3E3",
    secondary: "#C4C7C5",
    placeholder: "#333537",
    switchOn: "#A8C7FA",
    switchOnThumb: "#062E6F",
  },
};

function useSystemColors() {
  return systemColors[useColorScheme() === "dark" ? "dark" : "light"];
}

const roolioIcon = require("../../../assets/icon.png");

/** A "screenshot" of a system screen with a back arrow and title. */
export function MockScreen({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const system = useSystemColors();
  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: system.screen, borderColor: system.frame },
      ]}
      // Decorative: the step text next to each sketch carries the instruction.
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.topBar}>
        <MaterialIcons name="arrow-back" size={20} color={system.text} />
        <Text
          style={[styles.topBarTitle, { color: system.text }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

/** A row in a system app list. Without `roolio`, a blank placeholder app. */
export function MockAppRow({
  roolio,
  subtitle,
}: {
  roolio?: boolean;
  subtitle?: string;
}) {
  const system = useSystemColors();
  const row = (
    <View style={styles.appRow}>
      {roolio ? (
        <Image source={roolioIcon} style={styles.appIcon} />
      ) : (
        <View
          style={[styles.appIcon, { backgroundColor: system.placeholder }]}
        />
      )}
      <View style={styles.appRowText}>
        {roolio ? (
          <>
            <Text style={[styles.rowLabel, { color: system.text }]}>
              Roolio
            </Text>
            {subtitle && (
              <Text style={[styles.rowSubtitle, { color: system.secondary }]}>
                {subtitle}
              </Text>
            )}
          </>
        ) : (
          <>
            <View
              style={[
                styles.placeholderLine,
                { backgroundColor: system.placeholder, width: "55%" },
              ]}
            />
            <View
              style={[
                styles.placeholderLine,
                { backgroundColor: system.placeholder, width: "30%" },
              ]}
            />
          </>
        )}
      </View>
    </View>
  );
  return roolio ? <Highlight>{row}</Highlight> : row;
}

/** Roolio's page in Settings: its icon and name, then the switch, turned on. */
export function MockSwitchPage({
  title,
  switchLabel,
}: {
  title: string;
  switchLabel: string;
}) {
  const system = useSystemColors();
  return (
    <MockScreen title={title}>
      <View style={styles.appHeader}>
        <Image source={roolioIcon} style={styles.appHeaderIcon} />
        <Text style={[styles.rowLabel, { color: system.text }]}>Roolio</Text>
      </View>
      <Highlight>
        <View style={styles.switchRow}>
          <Text
            style={[
              styles.rowLabel,
              styles.switchLabel,
              { color: system.text },
            ]}
          >
            {switchLabel}
          </Text>
          <View
            style={[styles.switchTrack, { backgroundColor: system.switchOn }]}
          >
            <View
              style={[
                styles.switchThumb,
                { backgroundColor: system.switchOnThumb },
              ]}
            />
          </View>
        </View>
      </Highlight>
    </MockScreen>
  );
}

// Roolio's annotation ring around the thing to tap.
function Highlight({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.highlight, { borderColor: colors.primary }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    borderRadius: radius.medium,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: space.md,
    paddingBottom: space.md,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    height: 48,
  },
  topBarTitle: {
    flex: 1,
    fontSize: 16,
  },
  appRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm,
  },
  appIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  appRowText: {
    flex: 1,
    gap: 6,
  },
  rowLabel: {
    fontSize: 15,
  },
  rowSubtitle: {
    fontSize: 13,
  },
  placeholderLine: {
    height: 8,
    borderRadius: 4,
  },
  appHeader: {
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.md,
  },
  appHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
  },
  switchLabel: {
    flex: 1,
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 3,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  highlight: {
    borderWidth: 2,
    borderRadius: radius.small,
    marginHorizontal: -2,
  },
});
