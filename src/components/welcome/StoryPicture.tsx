import { useMemo } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";
import { radius, space } from "../../theme/tokens";
import { BEAT, keyframes } from "./storyClock";

type Motion = Animated.AnimatedInterpolation<number>;

// One app's time over three days, drawn like the Home card: an indigo bar per
// day, grey for what's gone, banked time as a green piece on the left and
// borrowed time as a rust piece on the right. Fixed sizes, so the pieces move
// by known distances.
const MINUTE = 2.4;
const BAR = 60 * MINUTE;
const PIECE = 20 * MINUTE;
const GAP = 6;
const BAR_X = PIECE + GAP;
const WIDTH = BAR_X + BAR + GAP + PIECE;

const BAR_HEIGHT = 14;
const LABEL_HEIGHT = 18;
// From the top of a day's label to the top of its bar.
const BAR_OFFSET = LABEL_HEIGHT + 8;
// From one day to the next, which is also how far a piece moves up or down.
const ROW_STEP = BAR_OFFSET + BAR_HEIGHT + 18;
const YESTERDAY_Y = 0;
const TODAY_Y = ROW_STEP;
const TOMORROW_Y = 2 * ROW_STEP;
const HEIGHT = TOMORROW_Y + BAR_OFFSET + BAR_HEIGHT;

// How far a piece first moves the other way, so it reads as picked up.
const LIFT = 7;
// Everything shown fades away at the end of the loop, over this part of it.
const FADE = 0.06;

/**
 * The story in one picture, every move ending in today. Yesterday's hour runs
 * down and leaves 20 minutes, which drop into today as banked time. Today
 * uses its hour, then that banked time, and 20 minutes of tomorrow move up to
 * keep it going. Decorative: the steps under it say the same.
 */
export function StoryPicture({ clock }: { clock: Animated.Value }) {
  const { colors } = useAppTheme();
  const motion = useMemo(() => {
    const { bank, borrow, reset } = BEAT;
    return {
      fadeOut: keyframes(clock, [
        [reset, 1],
        [reset + FADE, 0],
      ]),
      // 40 of yesterday's 60 minutes are used, then the rest leaves with the
      // piece that carries it into today.
      yesterdayGone: keyframes(clock, [
        [0.04, 0],
        [bank - 0.08, 2 / 3],
        [bank, 2 / 3],
        [bank + 0.02, 1],
      ]),
      saved: keyframes(clock, [
        [bank - 0.02, 0],
        [bank - 0.01, 1],
        [reset, 1],
        [reset + FADE, 0],
      ]),
      savedX: keyframes(clock, [
        [bank + 0.02, 0],
        [bank + 0.14, -BAR_X],
      ]),
      savedY: keyframes(clock, [
        [bank + 0.02, 0],
        [bank + 0.05, -LIFT],
        [bank + 0.14, ROW_STEP],
      ]),
      banked: keyframes(clock, [
        [bank + 0.06, 0],
        [bank + 0.14, 1],
      ]),
      // Today spends its own hour first, then the banked time.
      todayGone: keyframes(clock, [
        [borrow + 0.01, 0],
        [borrow + 0.1, 1],
      ]),
      bankedGone: keyframes(clock, [
        [borrow + 0.1, 0],
        [borrow + 0.14, 1],
      ]),
      borrowed: keyframes(clock, [
        [borrow + 0.15, 0],
        [borrow + 0.17, 1],
        [reset, 1],
        [reset + FADE, 0],
      ]),
      borrowedX: keyframes(clock, [
        [borrow + 0.18, 0],
        [borrow + 0.27, BAR_X],
      ]),
      borrowedY: keyframes(clock, [
        [borrow + 0.18, 0],
        [borrow + 0.21, LIFT],
        [borrow + 0.27, -ROW_STEP],
      ]),
      // Tomorrow's last 20 minutes leave with the piece.
      tomorrowGone: keyframes(clock, [
        [borrow + 0.17, 0],
        [borrow + 0.18, 1 / 3],
      ]),
    };
  }, [clock]);

  return (
    <View
      style={[
        styles.backdrop,
        {
          backgroundColor: colors.surfaceContainer,
          borderColor: colors.outlineVariant,
        },
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.stage}>
        <Day
          label="Yesterday"
          top={YESTERDAY_Y}
          gone={motion.yesterdayGone}
          fadeOut={motion.fadeOut}
        />
        <Day
          label="Today"
          top={TODAY_Y}
          gone={motion.todayGone}
          fadeOut={motion.fadeOut}
          current
        />
        <Day
          label="Tomorrow"
          top={TOMORROW_Y}
          gone={motion.tomorrowGone}
          fadeOut={motion.fadeOut}
        />

        {/* Yesterday's unused time, turning green as it's banked in today. */}
        <Animated.View
          style={[
            styles.piece,
            {
              left: BAR_X,
              top: YESTERDAY_Y + BAR_OFFSET,
              backgroundColor: colors.primary,
              opacity: motion.saved,
              transform: [
                { translateX: motion.savedX },
                { translateY: motion.savedY },
              ],
            },
          ]}
          renderToHardwareTextureAndroid
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: colors.banked, opacity: motion.banked },
            ]}
          />
          <Animated.View
            style={[
              styles.gone,
              {
                backgroundColor: colors.outlineVariant,
                transform: [{ scaleX: motion.bankedGone }],
              },
            ]}
          />
        </Animated.View>

        {/* Tomorrow's time, borrowed into today. */}
        <Animated.View
          style={[
            styles.piece,
            {
              left: BAR_X + BAR - PIECE,
              top: TOMORROW_Y + BAR_OFFSET,
              backgroundColor: colors.borrowed,
              opacity: motion.borrowed,
              transform: [
                { translateX: motion.borrowedX },
                { translateY: motion.borrowedY },
              ],
            },
          ]}
          renderToHardwareTextureAndroid
        />
      </View>
    </View>
  );
}

// A day's label and bar, with what's gone in grey from the right.
function Day({
  label,
  top,
  gone,
  fadeOut,
  current = false,
}: {
  label: string;
  top: number;
  gone: Motion;
  fadeOut: Motion;
  // Today, where every move ends, reads a little stronger.
  current?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <>
      <Text
        style={[
          styles.label,
          current && styles.labelCurrent,
          {
            top,
            color: current ? colors.onSurface : colors.onSurfaceVariant,
          },
        ]}
        allowFontScaling={false}
      >
        {label}
      </Text>
      <View
        style={[
          styles.bar,
          { top: top + BAR_OFFSET, backgroundColor: colors.primary },
        ]}
      >
        <Animated.View
          style={[
            styles.gone,
            {
              backgroundColor: colors.outlineVariant,
              opacity: fadeOut,
              transform: [{ scaleX: gone }],
            },
          ]}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  // Like the onboarding's other previews.
  backdrop: {
    borderRadius: radius.large,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
  },
  stage: {
    width: WIDTH,
    height: HEIGHT,
  },
  label: {
    position: "absolute",
    left: BAR_X,
    fontSize: 13,
    lineHeight: LABEL_HEIGHT,
  },
  labelCurrent: {
    fontWeight: "600",
  },
  bar: {
    position: "absolute",
    left: BAR_X,
    width: BAR,
    height: BAR_HEIGHT,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  // What's gone, in grey from the right, as on the Home card.
  gone: {
    ...StyleSheet.absoluteFill,
    transformOrigin: "right",
  },
  piece: {
    position: "absolute",
    width: PIECE,
    height: BAR_HEIGHT,
    borderRadius: radius.full,
    overflow: "hidden",
  },
});
