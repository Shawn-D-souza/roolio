# Roolio website

The public site for Roolio, built with [Astro](https://docs.astro.build) as plain static HTML and CSS. It's separate from the app: it has its own `package.json`, and nothing here is bundled into the app.

## Commands

Run these from `site/`. Node 22.22 or later is required.

```bash
npm install
npm run dev       # local server at http://localhost:4321
npm run check     # type-check .astro and .ts files
npm run build     # static output in dist/
npm run preview   # serve the built dist/
```

## Where things live

- `src/pages/`: one file per route. `index.astro` is the homepage, `privacy.astro` is the privacy policy (the URL given to Google Play), and `og-image.png.ts` draws the social card at build time.
- `src/components/home/`: the homepage sections, in page order in `index.astro`.
- `src/components/mock/`: HTML copies of the app's screens (budget card, usage bar, pause screen). They follow the app's components in `src/components/` at the repo root, so update them when the app's look changes.
- `src/styles/tokens.css`: colors copied from the app's `src/theme/tokens.ts`. Keep the two in step.
- `src/brand/mark.ts`: the time jar logo, drawn from `assets/icon-source/roolio-icon.svg`.
- `src/config.ts`: the developer name, the contact email, the Google Play link, and whether the listing is live.

The domain is set as `site` in `astro.config.mjs`. Canonical links and the social card's URL are built from it.

## Going live on Google Play

Set `PLAY_STORE.live` to `true` in `src/config.ts`. The "Coming soon" labels then become download links.

## Deploying

Any static host works. Use these settings:

| Setting | Value |
| --- | --- |
| Root directory | `site` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 22 or later |

The Figtree font is downloaded from Fontsource during the build and served from the site itself, so the build needs network access. Pages make no third-party requests.
