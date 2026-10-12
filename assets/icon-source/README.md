# Icon sources

Vector masters for the Roolio time jar mark. See `DESIGN.md` → *Identity* for the
construction grid and the icon-only color values (these are not UI tokens).

Everything here is a source or an export for an external store listing — nothing in
this folder is bundled into the app.

| Source | Exports to | Used by |
|---|---|---|
| `roolio-icon.svg` | `../icon.png` (1024×1024, opaque) | `expo.icon` — iOS + Play Store listing. No alpha, by App Store rule. |
| `roolio-icon.svg` | `../favicon.png` (48×48) | `expo.web.favicon` |
| `roolio-adaptive-foreground.svg` | `../android-icon-foreground.png` (1024×1024) | `expo.android.adaptiveIcon.foregroundImage`, over `backgroundColor: #2B2670` |
| `roolio-adaptive-foreground.svg` | `../splash-icon.png` (1024×1024) | nothing yet — kept for a future `expo-splash-screen` config |
| `roolio-adaptive-monochrome.svg` | `../android-icon-monochrome.png` (1024×1024) | `expo.android.adaptiveIcon.monochromeImage` — Android 13+ themed icons |
| `roolio-notification.svg` | `../notification-icon.png` (96×96) | nothing yet — kept for a future `expo-notifications` config |
| — | `play-store-512.png` | Play Console listing upload (not referenced by the app) |

## Regenerating

Keep the mark inside Android's central 66% safe zone on the adaptive layers — the
current export spans 26.7–73.3% horizontally and 21.6–78.4% vertically. Both the
adaptive foreground and the monochrome layer need a transparent background; `icon.png`
must stay fully opaque.
