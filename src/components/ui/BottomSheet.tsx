import { ReactNode, useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { useReduceMotion } from "../../hooks/useReduceMotion";

// Material 3 motion: enter slightly slower than exit, decelerating in.
const ENTER_MS = 280;
const EXIT_MS = 200;
const OFFSCREEN = 600;

type BottomSheetProps = {
  visible: boolean;
  // Called on back press and scrim tap.
  onDismiss: () => void;
  children: ReactNode;
  // Pinned below the scrolling content, e.g. the sheet's main action.
  footer?: ReactNode;
};

// A Material 3 modal bottom sheet that follows the app theme.
export function BottomSheet({
  visible,
  onDismiss,
  children,
  footer,
}: BottomSheetProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  // 0 = hidden, 1 = shown. Drives the scrim fade and the sheet slide.
  const [progress] = useState(() => new Animated.Value(0));
  // The Modal stays mounted until the exit animation has finished.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted) return;
    const animation = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 0 : visible ? ENTER_MS : EXIT_MS,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => animation.stop();
  }, [visible, mounted, reduceMotion, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [OFFSCREEN, 0],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Ignore touches while closing so an action can't fire twice. */}
      <View
        style={[styles.root, { pointerEvents: visible ? "auto" : "none" }]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.scrim, opacity: progress },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surfaceContainerHigh,
              paddingBottom: insets.bottom + space.lg,
              maxHeight: "90%",
              transform: [{ translateY }],
            },
          ]}
        >
          <View
            style={[styles.handle, { backgroundColor: colors.outline }]}
          />
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer && <View style={styles.footer}>{footer}</View>}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: radius.extraLarge,
    borderTopRightRadius: radius.extraLarge,
  },
  handle: {
    alignSelf: "center",
    width: 32,
    height: 4,
    borderRadius: radius.full,
    marginTop: space.lg,
    marginBottom: space.sm,
    opacity: 0.4,
  },
  content: {
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.lg,
  },
  footer: {
    paddingHorizontal: space.xl,
  },
});
