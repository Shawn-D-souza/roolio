type ColorScheme = "light" | "dark";

export type AppColors = {
  background: string;
  surface: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  banked: string;
  borrowed: string;
  borrowedContainer: string;
  onBorrowedContainer: string;
  low: string;
  lowContainer: string;
  onLowContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  scrim: string;
  // Apps in the Stats charts, most used first; the rest share `outline`.
  series: readonly [string, string, string];
};

/**
 * Roolio color tokens.
 *
 * Contrast was checked with WCAG 2.x ratios. Targets:
 *   - 4.5:1 for normal text (AA)
 *   - 3:1 for large text, icons, and UI borders (input outlines, focus rings)
 *
 * READ BEFORE USING OR CHANGING ANY COLOR
 * ---------------------------------------
 * 1. TEXT ON CONTAINERS
 *    Always use the matching "on*" color for text on a container:
 *      primaryContainer  -> onPrimaryContainer
 *      borrowedContainer -> onBorrowedContainer
 *      lowContainer      -> onLowContainer
 *      errorContainer    -> onErrorContainer
 *    Do NOT put `borrowed` text on `borrowedContainer` in light mode. It is
 *    only 4.56:1, barely passing, and any tweak would push it under AA.
 *
 * 2. outline vs outlineVariant
 *    - `outline` is for anything the user must see to operate: input field
 *      borders, checkbox/radio borders, placeholder and helper text.
 *      Light: 5.09:1 on background, 4.60:1 on surfaceContainer.
 *      Dark: 5.88:1 on background, 5.22:1 on surfaceContainer.
 *    - `outlineVariant` is DECORATIVE ONLY (hairline dividers, subtle card
 *      edges). It is 1.63:1 (light) and 2.01:1 (dark), which fails the 3:1
 *      needed for UI boundaries. Never use it for input borders or for
 *      anything that has to be seen to be usable.
 *    - Light `outline` was darkened from #787680 to #6C6A74 to pass AA.
 *      On surfaceContainerHigh (4.30) and surfaceContainerHighest (4.06) it
 *      is fine for borders (3:1) but NOT for normal text. Keep outline text
 *      on background or surfaceContainer only.
 *
 * 3. COLOR IS NEVER THE ONLY SIGNAL
 *    `borrowed` (rust) and `error` (red) are close in hue in light mode, and
 *    `low` (amber) is also hard to separate for users with red-green color
 *    blindness. Always pair these with an icon or a text label (for example
 *    "Borrowed", "Low stock", an error icon). Never rely on color alone.
 *
 * 4. SURFACES ARE VERY CLOSE TOGETHER
 *    `surface` is identical to `background`, and `surfaceContainer` is only
 *    about 1.1:1 against it. Cards and sheets on these will not stand out by
 *    fill alone. Give them a 1px `outline` border or an elevation/shadow so
 *    they read as separate.
 *
 * 5. CHART SERIES
 *    `series` tells apps apart in the Stats charts: violet, blue, magenta.
 *    Hues near banked (green), borrowed (rust), low (amber) and error (red)
 *    are left out, so an app never reads as one of those. Each set passed the
 *    dataviz palette validator against `surfaceContainer`, all pairs, in its
 *    own mode: worst colorblind ΔE 15.7 light / 11.4 dark (target 8), normal
 *    vision 25.1 / 21.0 (floor 15), every color 3:1 or better. Re-run it on any
 *    change. Charts always name their apps too.
 *
 * 6. IF YOU CHANGE ANY VALUE
 *    Re-check contrast for every text/background pair it touches before
 *    shipping. Do not eyeball it; the palette passes AA today because the
 *    pairs were measured.
 */
export const colors: Record<ColorScheme, AppColors> = {
  light: {
    background: "#FBF9FF",
    surface: "#FBF9FF",
    surfaceContainer: "#F0EDF9",
    surfaceContainerHigh: "#E9E5F4",
    surfaceContainerHighest: "#E3DFEE",
    onSurface: "#1B1B21",
    onSurfaceVariant: "#47464F",
    outline: "#6C6A74",
    outlineVariant: "#C8C5D0", // decorative dividers only
    primary: "#4F46B8",
    onPrimary: "#FFFFFF",
    primaryContainer: "#E3DFFF",
    onPrimaryContainer: "#14006B",
    // Banked time in usage bars and legends (4.3:1 on surfaceContainer).
    // Green so it can't be mistaken for the indigo budget or rust borrowed.
    banked: "#2E7D5B",
    borrowed: "#A8452D",
    borrowedContainer: "#FFDAD1",
    onBorrowedContainer: "#3A0B00",
    low: "#7A5900",
    lowContainer: "#FFDEA3",
    onLowContainer: "#261A00",
    error: "#BA1A1A",
    onError: "#FFFFFF",
    errorContainer: "#FFDAD6",
    onErrorContainer: "#410002",
    // Overlay behind dialogs and sheets. Dark mode needs a stronger value,
    // since dimming an already-dark page barely shows.
    scrim: "rgba(0, 0, 0, 0.4)",
    series: ["#721DAF", "#338DDF", "#E63E84"],
  },
  dark: {
    background: "#121218",
    surface: "#121218",
    surfaceContainer: "#1E1E25",
    surfaceContainerHigh: "#2C2C34",
    surfaceContainerHighest: "#36363E",
    onSurface: "#E4E1E9",
    onSurfaceVariant: "#C8C5D0",
    outline: "#928F9A",
    outlineVariant: "#47464F", // decorative dividers only
    primary: "#C4C1FF",
    onPrimary: "#26148A",
    primaryContainer: "#3D3AA0",
    onPrimaryContainer: "#E3DFFF",
    banked: "#7DD8AE",
    borrowed: "#FFB4A0",
    borrowedContainer: "#5C1F0F",
    onBorrowedContainer: "#FFDAD1",
    low: "#F2BF48",
    lowContainer: "#5A4200",
    onLowContainer: "#FFDEA3",
    error: "#FFB4AB",
    onError: "#690005",
    errorContainer: "#93000A",
    onErrorContainer: "#FFDAD6",
    scrim: "rgba(0, 0, 0, 0.6)",
    series: ["#B167F7", "#2F72B1", "#D02572"],
  },
};

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  small: 8,
  medium: 12,
  large: 20,
  extraLarge: 28,
  full: 9999,
} as const;
