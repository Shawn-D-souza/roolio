# Roolio: Design Guide (v1)

Companion to `Roolio_PRD.md`. This file defines how Roolio looks, feels, and sounds.

## Direction

**Personality: Calm.** Roolio should feel like a quiet, supportive friend, not a strict warden and not a game. Soft shapes, generous space, gentle language, and one color (indigo) that carries meaning.

**Foundation:** Material 3 (MD3) patterns, restyled with Roolio's own colors, type, and wording. Android only in v1. Tokens are defined platform-neutrally (section 14) so a future iOS version can reuse them.

### Principles
1. **Calm over clever.** Never shame, never nag. The pause screen informs; it doesn't scold.
2. **Numbers first.** Available time is the hero of every card. Banked and borrowed are always visible, never hidden behind a tap.
3. **Color means something.** Indigo = your time (available and banked). Warm coral = borrowed or out of time. Amber = running low. Nothing else gets color.
4. **Same words everywhere.** "Banked", "Borrowed", "Available", "Changes tomorrow". Never swap in synonyms.
5. **Quiet by default.** Tonal surfaces, no shadows, no gradients, no decoration. If a screen feels cluttered, remove something.

## Identity (logo and app icon)

### The mark: the time jar
A round glass jar holding saved time (coral), with a clock coin resting above the surface. It says one thing: time you don't use is kept for later. That is Roolio's banking idea, drawn as an object.

There is **one icon**, used in both light and dark themes. The deep indigo tile carries its own background, so it reads on any wallpaper. Do not make separate light and dark versions.

### Icon colors
These belong to the icon only. They are not UI tokens and should not be added to `theme/tokens.ts`.

| Part | Hex | Notes |
|---|---|---|
| Tile background | #2B2670 | Deep indigo, solid, no gradient |
| Jar glass and lid | #C9C5FF | Glass body at 14% opacity, outline and lid at 100% |
| Saved time (wave) | #FF9E85 | Coral, with a gentle wave on the surface |
| Clock coin | #FFFFFF | Hands in #2B2670 |
| Glass highlight | #FFFFFF at 45% | Small arc on the upper left of the jar |

Coral is the brand accent in the icon. Inside the app, coral still means borrowed or out of time (section 2). Never reuse the jar or its coral fill as a status indicator in the UI.

### Construction
Drawn on a 96-unit grid, centered on the tile.
- Jar: circle centered at (48, 54), radius 26, outline 4. Neck and lid sit on the vertical center line.
- Clock coin: radius 9.5, centered at (48, 46), above the wave.
- Wave: a soft S-curve at about y = 61, clipped inside the jar.
- The whole mark is centered vertically on the tile (top of lid at 14, bottom of jar at 82).
- Tile corner radius is 25% of the width (24 of 96) when shown rounded in the app. In the launcher and the Play Store, supply a full-bleed square and let Android apply the mask.
