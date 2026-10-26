import { useEffect, useState } from "react";
import { Animated, Easing } from "react-native";
import { useReduceMotion } from "../../hooks/useReduceMotion";

/**
 * The welcome screen's story: a limit runs down, unused time is banked, then
 * time is borrowed. The picture and the steps beside it read one clock, which
 * the native driver loops on the UI thread, so no JS runs per frame.
 */

const STORY_MS = 11000;

// Where each beat starts, as parts of the loop. After `reset` everything
// fades back for the next loop.
export const BEAT = { bank: 0.3, borrow: 0.55, reset: 0.93 } as const;

// Where the story holds when animations are reduced: yesterday's unused time
// has just landed in today.
const REST = 0.5;

/** Runs from 0 to 1 every loop, or holds at REST when animations are reduced. */
export function useStoryClock() {
  const reduceMotion = useReduceMotion();
  const [clock] = useState(() => new Animated.Value(REST));

  useEffect(() => {
    if (reduceMotion) {
      clock.setValue(REST);
      return;
    }
    clock.setValue(0);
    // A loop of a single native timing repeats on the UI thread by itself.
    const loop = Animated.loop(
      Animated.timing(clock, {
        toValue: 1,
        duration: STORY_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, clock]);

  return clock;
}

// [where in the loop, value there]
type Keyframe = readonly [at: number, value: number];

// Native interpolation is linear only, so each move between two keyframes is
// sampled along an ease-in-out curve.
const SAMPLES = 6;

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** `clock` through `frames`, eased between them and held before and after. */
export function keyframes(clock: Animated.Value, frames: readonly Keyframe[]) {
  const inputRange = [frames[0][0]];
  const outputRange = [frames[0][1]];
  for (let i = 1; i < frames.length; i++) {
    const [fromAt, from] = frames[i - 1];
    const [toAt, to] = frames[i];
    const steps = from === to ? 1 : SAMPLES;
    for (let step = 1; step <= steps; step++) {
      const progress = step / steps;
      // The last sample lands exactly on the keyframe, so the input range
      // never steps backwards by a rounding error.
      inputRange.push(
        step === steps ? toAt : fromAt + (toAt - fromAt) * progress,
      );
      outputRange.push(from + (to - from) * easeInOut(progress));
    }
  }
  return clock.interpolate({ inputRange, outputRange, extrapolate: "clamp" });
}
