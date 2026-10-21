// @ts-check
import { defineConfig, fontProviders } from "astro/config";

export default defineConfig({
  // The production domain. Canonical links and social cards are built from it.
  site: "https://roolio.app",
  fonts: [
    {
      // Downloaded at build time and served from this site, so pages make no
      // third-party requests.
      provider: fontProviders.fontsource(),
      name: "Figtree",
      cssVariable: "--font-figtree",
      weights: ["400 800"],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["sans-serif"],
    },
  ],
});
