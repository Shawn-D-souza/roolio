import { StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { FEEDBACK_EMAIL, sendFeedback } from "../../feedback";
import { TextButton } from "../ui/TextButton";

type EarlyAccessNoteProps = {
  isPremium: boolean;
};

// Why Premium is free for now, and an invitation to send feedback.
export function EarlyAccessNote({ isPremium }: EarlyAccessNoteProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surfaceContainer,
          borderColor: colors.outlineVariant,
        },
      ]}
    >
      <View style={styles.note}>
        <View
          style={[styles.iconCircle, { backgroundColor: colors.lowContainer }]}
        >
          <MaterialIcons
            name="science"
            size={20}
            color={colors.onLowContainer}
          />
        </View>
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.onSurface }]}>
            Roolio is in early access
          </Text>
          <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
            It&apos;s new and still being tested, so Premium is free for now.
            Later on, it will become a paid upgrade.
            {isPremium
              ? " If you switch to Free, the budgets you already have keep working."
              : ""}
          </Text>
        </View>
      </View>

      <View
        style={[styles.divider, { backgroundColor: colors.outlineVariant }]}
      />

      <View style={styles.note}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.primaryContainer },
          ]}
        >
          <MaterialIcons
            name="mail-outline"
            size={20}
            color={colors.onPrimaryContainer}
          />
        </View>
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.onSurface }]}>
            Help shape Roolio
          </Text>
          <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
            Something not working, or an idea for what Roolio should do next?
            Email me at{" "}
            <Text style={[styles.email, { color: colors.onSurface }]}>
              {FEEDBACK_EMAIL}
            </Text>
            .
          </Text>
          <View style={styles.action}>
            <TextButton
              variant="secondary"
              icon="mail-outline"
              label="Send feedback"
              onPress={sendFeedback}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.large,
    borderWidth: 1,
    overflow: "hidden",
  },
  // Icons sit beside the title, however long the text under it runs.
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
    padding: space.lg,
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
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  email: {
    fontWeight: "600",
  },
  action: {
    marginTop: space.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: space.lg,
  },
});
