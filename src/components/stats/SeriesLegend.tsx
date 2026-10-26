import { StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { space } from "../../theme/tokens";

// Names the colors of the app charts. Hidden from screen readers: each chart
// reads out its apps itself.
export function SeriesLegend({
  keys,
  colorOf,
  nameOf,
}: {
  keys: string[];
  colorOf: (key: string) => string;
  nameOf: (key: string) => string;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.legend} importantForAccessibility="no-hide-descendants">
      {keys.map((key) => (
        <View key={key} style={styles.item}>
          <View style={[styles.swatch, { backgroundColor: colorOf(key) }]} />
          <Text
            style={[styles.text, { color: colors.onSurfaceVariant }]}
            numberOfLines={1}
          >
            {nameOf(key)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: space.lg,
    rowGap: space.sm,
    marginTop: space.lg,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    maxWidth: "100%",
  },
  swatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  text: {
    fontSize: 14,
    flexShrink: 1,
  },
});
