import { StyleSheet, Text, View, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme, ThemeMode } from "../../theme/ThemeProvider";
import { space, radius } from "../../theme/tokens";

interface ThemeOption {
  value: ThemeMode;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "system",
    label: "System",
    icon: "brightness-auto",
  },
  {
    value: "light",
    label: "Light",
    icon: "light-mode",
  },
  {
    value: "dark",
    label: "Dark",
    icon: "dark-mode",
  },
];

export function ThemeSelector() {
  const { mode, setMode, colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>
        Theme
      </Text>

      <View
        style={[
          styles.optionsContainer,
          {
            backgroundColor: colors.surfaceContainer,
            borderColor: colors.outlineVariant,
          },
        ]}
      >
        {THEME_OPTIONS.map((option) => {
          const isSelected = mode === option.value;

          return (
            <Pressable
              key={option.value}
              onPress={() => setMode(option.value)}
              style={[
                styles.optionButton,
                {
                  backgroundColor: isSelected
                    ? colors.primaryContainer
                    : "transparent",
                },
              ]}
            >
              <MaterialIcons
                name={option.icon}
                size={20}
                color={
                  isSelected
                    ? colors.onPrimaryContainer
                    : colors.onSurfaceVariant
                }
              />
              <Text
                style={[
                  styles.optionLabel,
                  {
                    color: isSelected
                      ? colors.onPrimaryContainer
                      : colors.onSurface,
                    fontWeight: isSelected ? "600" : "400",
                  },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: space.md,
    marginLeft: space.xs,
  },
  optionsContainer: {
    flexDirection: "row",
    borderRadius: radius.large,
    padding: space.xs,
    borderWidth: 1,
    gap: space.xs,
  },
  optionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    borderRadius: radius.medium,
    gap: space.sm,
  },
  optionLabel: {
    fontSize: 15,
  },
});
