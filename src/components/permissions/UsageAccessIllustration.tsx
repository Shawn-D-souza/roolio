import Svg, { Circle, Line, Rect } from "react-native-svg";
import { useAppTheme } from "../../theme/ThemeProvider";

const WIDTH = 240;
const HEIGHT = 200;

// App rows on the phone: tile opacity and usage bar length.
const ROWS = [
  { y: 52, tile: 1, bar: 34 },
  { y: 84, tile: 0.65, bar: 22 },
  { y: 116, tile: 0.4, bar: 12 },
];

/** A phone listing apps with time bars and a clock: "time spent per app". */
export function UsageAccessIllustration() {
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

      {ROWS.map((row) => (
        <Rect
          key={`tile-${row.y}`}
          x={90}
          y={row.y}
          width={22}
          height={22}
          rx={6}
          fill={colors.primary}
          opacity={row.tile}
        />
      ))}
      {ROWS.map((row) => (
        <Rect
          key={`bar-${row.y}`}
          x={120}
          y={row.y + 7}
          width={row.bar}
          height={8}
          rx={4}
          fill={colors.primary}
          opacity={0.45}
        />
      ))}

      {/* Clock badge, ringed in the page color so it sits on top of the phone. */}
      <Circle
        cx={164}
        cy={150}
        r={28}
        fill={colors.primary}
        stroke={colors.background}
        strokeWidth={5}
      />
      <Line
        x1={164}
        y1={150}
        x2={164}
        y2={135}
        stroke={colors.onPrimary}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <Line
        x1={164}
        y1={150}
        x2={175}
        y2={157}
        stroke={colors.onPrimary}
        strokeWidth={4}
        strokeLinecap="round"
      />
    </Svg>
  );
}
