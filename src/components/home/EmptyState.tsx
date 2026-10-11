import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Path } from "react-native-svg";
import { useAppTheme } from "../../theme/ThemeProvider";
import { space } from "../../theme/tokens";

const ARROW_WIDTH = 240;
const ARROW_HEIGHT = 210;
const ARROW_CURVE = "M 44 10 C 30 80 116 106 156 136";
const ARROW_HEAD = "M 149 119 L 156 136 L 138 134";

export function EmptyState() {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      
       <View style={styles.content}>
        <MaterialIcons
          name="hourglass-empty"
          size={64}
          color={colors.primary}
          style={{ marginBottom: space.xl }}
        />
        <Text style={[styles.headline, { color: colors.onSurface }]}>
          Start your first budget
        </Text>
        <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
          Pick an app you want to spend less time on, and set your daily limit.
        </Text>
      </View>

      <Svg
        width={ARROW_WIDTH}
        height={ARROW_HEIGHT}
        viewBox={`0 0 ${ARROW_WIDTH} ${ARROW_HEIGHT}`}
        style={styles.arrow}
        pointerEvents="none"
      >
        <Path
          d={ARROW_CURVE}
          stroke={colors.primary}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={ARROW_HEAD}
          stroke={colors.primary}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 35,
    paddingBottom: 100, 
  },
  headline: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 12,
  },
  body: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 24,
  },
  arrow: {
    position: "absolute",
    right: 0,
    bottom: 0,
  },
});