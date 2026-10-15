import { ReactNode, useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { useReduceMotion } from "../../hooks/useReduceMotion";
import { BottomSheet } from "../ui/BottomSheet";
import { PrimaryButton } from "../ui/PrimaryButton";
import { TextButton } from "../ui/TextButton";
import { NumberedStep, NumberedSteps } from "./NumberedSteps";

type IconName = keyof typeof MaterialIcons.glyphMap;

export type Highlight = {
  icon: IconName;
  label: string;
};

export type Faq = {
  question: string;
  answer: string;
};

export type GuidedStepContent = {
  // Why Roolio needs it, shown first. Kept to a glance.
  intro: {
    illustration: ReactNode;
    title: string;
    body: string;
    // A lead-in that the highlights complete, e.g. "Your data always stays"
    // + "Private". Each highlight is a few words.
    highlightsTitle: string;
    highlights: Highlight[];
  };
  // Full answers for anyone who wants them, behind "Learn more".
  learnMore: {
    title: string;
    faqs: Faq[];
  };
  // How to grant it, shown right before Settings opens.
  guide: {
    title: string;
    tip: string;
    steps: NumberedStep[];
  };
};

type GuidedPermissionStepProps = {
  content: GuidedStepContent;
  // Setup progress, shown on the intro only.
  progress?: ReactNode;
  // Why the user is back here without the permission, if they are.
  hint: string | null;
  onOpenSettings: () => void;
};

const ENTER_MS = 240;
const ENTER_OFFSET = 24;

/**
 * A permission in two screens, like most well-liked Android apps do it:
 * first why Roolio needs it, then exactly what to tap in Settings.
 */
export function GuidedPermissionStep({
  content,
  progress,
  hint,
  onOpenSettings,
}: GuidedPermissionStepProps) {
  const reduceMotion = useReduceMotion();
  // A returning hint means the user already went through the guide once.
  const [phase, setPhase] = useState<"intro" | "guide">(
    hint ? "guide" : "intro",
  );
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);

  // Android Back on the guide returns to the intro instead of leaving the app.
  useEffect(() => {
    if (phase !== "guide") return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setPhase("intro");
        return true;
      },
    );
    return () => subscription.remove();
  }, [phase]);

  // Slide forward into the guide, and back out to the intro.
  // The screen already animates a new step in, so skip the first phase.
  const [enter] = useState(() => new Animated.Value(1));
  const isFirstPhase = useRef(true);
  useEffect(() => {
    if (isFirstPhase.current) {
      isFirstPhase.current = false;
      return;
    }
    if (reduceMotion) return;
    enter.setValue(0);
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: ENTER_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [phase, reduceMotion, enter]);

  const direction = phase === "guide" ? 1 : -1;

  return (
    <Animated.View
      style={[
        styles.phase,
        {
          opacity: enter,
          transform: [
            {
              translateX: enter.interpolate({
                inputRange: [0, 1],
                outputRange: [ENTER_OFFSET * direction, 0],
              }),
            },
          ],
        },
      ]}
    >
      {phase === "intro" ? (
        <Intro
          content={content}
          progress={progress}
          onContinue={() => setPhase("guide")}
          onLearnMore={() => setLearnMoreOpen(true)}
        />
      ) : (
        <Guide
          content={content}
          hint={hint}
          onBack={() => setPhase("intro")}
          onOpenSettings={onOpenSettings}
        />
      )}

      <LearnMoreSheet
        content={content}
        visible={learnMoreOpen}
        onDismiss={() => setLearnMoreOpen(false)}
      />
    </Animated.View>
  );
}

function Intro({
  content,
  progress,
  onContinue,
  onLearnMore,
}: {
  content: GuidedStepContent;
  progress?: ReactNode;
  onContinue: () => void;
  onLearnMore: () => void;
}) {
  const { colors } = useAppTheme();
  const { intro } = content;

  return (
    <>
      {progress}
      <ScrollView
        contentContainerStyle={styles.introContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.illustration}>{intro.illustration}</View>

        <View style={styles.introText}>
          <Text
            style={[styles.introTitle, { color: colors.onSurface }]}
            accessibilityRole="header"
          >
            {intro.title}
          </Text>
          <Text style={[styles.introBody, { color: colors.onSurfaceVariant }]}>
            {intro.body}
          </Text>
        </View>

        <View style={styles.highlights}>
          <Text style={[styles.highlightsTitle, { color: colors.onSurface }]}>
            {intro.highlightsTitle}
          </Text>
          <View
            style={styles.highlightList}
            accessible
            accessibilityLabel={`${intro.highlightsTitle}: ${intro.highlights
              .map((highlight) => highlight.label)
              .join(", ")}`}
          >
            {intro.highlights.map((highlight) => (
              <View key={highlight.label} style={styles.highlight}>
                <View
                  style={[
                    styles.highlightIcon,
                    { backgroundColor: colors.primaryContainer },
                  ]}
                >
                  <MaterialIcons
                    name={highlight.icon}
                    size={19}
                    color={colors.onPrimaryContainer}
                  />
                </View>
                <Text
                  style={[styles.highlightLabel, { color: colors.onSurface }]}
                >
                  {highlight.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <PrimaryButton label="Continue" onPress={onContinue} />
        <TextButton label="Learn more" onPress={onLearnMore} />
      </View>
    </>
  );
}

function Guide({
  content,
  hint,
  onBack,
  onOpenSettings,
}: {
  content: GuidedStepContent;
  hint: string | null;
  onBack: () => void;
  onOpenSettings: () => void;
}) {
  const { colors } = useAppTheme();
  const { guide } = content;

  return (
    <>
      <View style={styles.topBar}>
        <Pressable
          onPress={onBack}
          hitSlop={space.sm}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.iconButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.guideContent}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[styles.guideTitle, { color: colors.onSurface }]}
          accessibilityRole="header"
        >
          {guide.title}
        </Text>

        {hint ? (
          <Callout
            icon="info-outline"
            text={hint}
            backgroundColor={colors.lowContainer}
            color={colors.onLowContainer}
            live
          />
        ) : (
          <Callout
            icon="lightbulb-outline"
            text={guide.tip}
            backgroundColor={colors.surfaceContainer}
            color={colors.onSurface}
            borderColor={colors.outlineVariant}
          />
        )}

        <NumberedSteps steps={guide.steps} />
      </ScrollView>

      <View style={styles.actions}>
        <PrimaryButton
          label="Open Settings"
          icon="open-in-new"
          accessibilityHint="Opens your phone's Settings"
          onPress={onOpenSettings}
        />
      </View>
    </>
  );
}

function LearnMoreSheet({
  content,
  visible,
  onDismiss,
}: {
  content: GuidedStepContent;
  visible: boolean;
  onDismiss: () => void;
}) {
  const { colors } = useAppTheme();
  const { learnMore } = content;

  return (
    <BottomSheet
      visible={visible}
      onDismiss={onDismiss}
      footer={<PrimaryButton label="Got it" onPress={onDismiss} />}
    >
      <Text
        style={[styles.sheetTitle, { color: colors.onSurface }]}
        accessibilityRole="header"
      >
        {learnMore.title}
      </Text>
      <View style={styles.faqs}>
        {learnMore.faqs.map((faq) => (
          <View key={faq.question} style={styles.faq} accessible>
            <Text style={[styles.question, { color: colors.onSurface }]}>
              {faq.question}
            </Text>
            <Text style={[styles.answer, { color: colors.onSurfaceVariant }]}>
              {faq.answer}
            </Text>
          </View>
        ))}
      </View>
    </BottomSheet>
  );
}

function Callout({
  icon,
  text,
  backgroundColor,
  color,
  borderColor,
  live,
}: {
  icon: IconName;
  text: string;
  backgroundColor: string;
  color: string;
  borderColor?: string;
  // Announce it to screen readers when it appears.
  live?: boolean;
}) {
  return (
    <View
      style={[
        styles.callout,
        { backgroundColor },
        borderColor && { borderColor, borderWidth: 1 },
      ]}
      accessibilityLiveRegion={live ? "polite" : "none"}
    >
      <MaterialIcons name={icon} size={20} color={color} />
      <Text style={[styles.calloutText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  phase: {
    flex: 1,
  },
  introContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: space.xl,
    paddingVertical: space.xl,
    gap: space.xl,
  },
  illustration: {
    alignItems: "center",
  },
  introText: {
    gap: space.md,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
    textAlign: "center",
  },
  introBody: {
    fontSize: 17,
    lineHeight: 25,
    textAlign: "center",
  },
  highlights: {
    alignItems: "center",
    gap: space.lg,
  },
  highlightsTitle: {
    fontSize: 19,
    fontWeight: "600",
    textAlign: "center",
  },
  // Shrinks to its widest row, so the left-aligned rows sit centered.
  highlightList: {
    gap: space.lg,
  },
  highlight: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  highlightIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  highlightLabel: {
    fontSize: 18,
  },
  topBar: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.xs,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  guideContent: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xl,
    gap: space.xl,
  },
  guideTitle: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
    marginHorizontal: space.xs,
  },
  callout: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
    borderRadius: radius.large,
    padding: space.lg,
  },
  calloutText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: space.xl,
  },
  faqs: {
    gap: space.xl,
  },
  faq: {
    gap: space.xs,
  },
  question: {
    fontSize: 16,
    fontWeight: "600",
  },
  answer: {
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
    gap: space.xs,
  },
});
