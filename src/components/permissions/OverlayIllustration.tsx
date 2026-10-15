import Svg, { Circle, Rect } from "react-native-svg";
import { useAppTheme } from "../../theme/ThemeProvider";

const WIDTH = 240;
const HEIGHT = 200;

/** Roolio's pause card sitting on top of another app: "display over apps". */
export function OverlayIllustration() {
  const { colors } = useAppTheme();

  return (
    <Svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle cx={120} cy={100} r={92} fill={colors.primaryContainer} />

      {/* The phone, running some other app. */}
      <Rect
        x={76}
        y={22}
        width={88}
        height={150}
        rx={16}
        fill={colors.surface}
        stroke={colors.outlineVariant}
        strokeWidth={2}
      />
      <Rect
        x={106}
        y={30}
        width={28}
        height={4}
        rx={2}
        fill={colors.outlineVariant}
      />
      <Rect
        x={88}
        y={44}
        width={64}
        height={36}
        rx={8}
        fill={colors.outlineVariant}
      />
      <Rect
        x={88}
        y={86}
        width={52}
        height={8}
        rx={4}
        fill={colors.outlineVariant}
      />
      <Rect
        x={88}
        y={100}
        width={36}
        height={8}
        rx={4}
        fill={colors.outlineVariant}
      />

      {/* Roolio's card, wider than the phone so it reads as "on top". */}
      <Rect
        x={60}
        y={118}
        width={124}
        height={68}
        rx={14}
        fill={colors.primary}
        opacity={0.18}
      />
      <Rect
        x={56}
        y={112}
        width={124}
        height={68}
        rx={14}
        fill={colors.surface}
        stroke={colors.primary}
        strokeWidth={2.5}
      />
      <Circle cx={78} cy={132} r={11} fill={colors.primaryContainer} />
      <Rect
        x={74}
        y={127}
        width={3}
        height={10}
        rx={1.5}
        fill={colors.onPrimaryContainer}
      />
      <Rect
        x={80}
        y={127}
        width={3}
        height={10}
        rx={1.5}
        fill={colors.onPrimaryContainer}
      />
      <Rect
        x={96}
        y={126}
        width={64}
        height={7}
        rx={3.5}
        fill={colors.onSurfaceVariant}
      />
      <Rect
        x={96}
        y={137}
        width={40}
        height={6}
        rx={3}
        fill={colors.outlineVariant}
      />
      <Rect
        x={68}
        y={154}
        width={100}
        height={16}
        rx={8}
        fill={colors.primary}
      />
    </Svg>
  );
}
