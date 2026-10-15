import { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import type { ClassicStep } from "../../permissions/steps";
import { PrimaryButton } from "../ui/PrimaryButton";
import { TextButton } from "../ui/TextButton";

type ClassicPermissionStepProps = {
  content: ClassicStep;
  progress?: ReactNode;
  hint: string | null;
  busy: boolean;
  // The main button: opens Settings or shows the system dialog.
  onAction: () => void;
  // Shown for optional steps only.
  onNotNow: () => void;
};

/** A permission on one screen with a single action. */
export function ClassicPermissionStep({
  content,
  progress,
  hint,
  busy,
  onAction,
  onNotNow,
}: ClassicPermissionStepProps) {
  const { colors } = useAppTheme();

  return (
    <>
      {progress}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {content.illustration}

        <View style={styles.text}>
          <Text
            style={[styles.title, { color: colors.onSurface }]}
            accessibilityRole="header"
          >
            {content.title}
          </Text>
          <Text style={[styles.body, { color: colors.onSurfaceVariant }]}>
            {content.body}
          </Text>
        </View>

        <View style={styles.note}>
          <MaterialIcons
            name={content.note.icon}
            size={18}
            color={colors.onSurfaceVariant}
          />
          <Text style={[styles.noteText, { color: colors.onSurfaceVariant }]}>
            {content.note.text}
          </Text>
        </View>

        {hint && (
          <View
            style={[styles.hint, { backgroundColor: colors.lowContainer }]}
            accessibilityLiveRegion="polite"
          >
            <MaterialIcons
              name="info-outline"
              size={20}
              color={colors.onLowContainer}
            />
            <Text style={[styles.hintText, { color: colors.onLowContainer }]}>
              {hint}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.actions}>
        <PrimaryButton
          label={content.actionLabel}
          icon={content.opensSettings ? "open-in-new" : undefined}
          accessibilityHint={
            content.opensSettings ? "Opens your phone's Settings" : undefined
          }
          busy={busy}
          onPress={onAction}
        />
        {!content.required && <TextButton label="Not now" onPress={onNotNow} />}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: space.xl,
    paddingVertical: space.xl,
    gap: space.xl,
  },
  text: {
    gap: space.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
    textAlign: "center",
  },
  body: {
    fontSize: 17,
    lineHeight: 25,
    textAlign: "center",
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  noteText: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  hint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
    borderRadius: radius.medium,
    padding: space.lg,
  },
  hintText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    gap: space.xs,
  },
});
