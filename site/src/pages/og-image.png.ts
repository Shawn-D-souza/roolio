import type { APIRoute } from "astro";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import satori from "satori";
import sharp from "sharp";
import { markDocument } from "../brand/mark";

// The 1200×630 card shown when a link to the site is shared. It's drawn at
// build time from the brand mark and Figtree, so it never drifts from the
// site. Satori lays it out and turns the text into shapes, so the result
// doesn't depend on the fonts installed on the build machine.

const WIDTH = 1200;
const HEIGHT = 630;

const require = createRequire(import.meta.url);

function font(weight: 400 | 700 | 800) {
  return readFile(require.resolve(`@fontsource/figtree/files/figtree-latin-${weight}-normal.woff`));
}

type Node = { type: string; props: Record<string, unknown> };

function el(type: string, style: Record<string, unknown>, children?: unknown): Node {
  return { type, props: { style, children } };
}

// One row of the app's usage bar: a banked pip, the day's budget, and a pip
// of borrowed time ahead.
function usageRow(): Node {
  const pip = (color: string, fill: number) =>
    el(
      "div",
      {
        display: "flex",
        width: 52,
        height: 26,
        borderRadius: 13,
        border: `3px solid ${color}`,
        overflow: "hidden",
      },
      el("div", { width: `${fill * 100}%`, height: "100%", background: color }),
    );

  return el("div", { display: "flex", alignItems: "center", gap: 24, width: 560 }, [
    pip("#2E7D5B", 0.66),
    // Drained from the right as it's used, like the app's bar.
    el(
      "div",
      {
        display: "flex",
        justifyContent: "flex-end",
        flexGrow: 1,
        height: 26,
        borderRadius: 13,
        overflow: "hidden",
        background: "#4F46B8",
      },
      el("div", { width: "30%", height: "100%", background: "#C8C5D0" }),
    ),
    pip("#A8452D", 0.25),
  ]);
}

export const GET: APIRoute = async () => {
  const [regular, bold, extraBold, mark] = await Promise.all([
    font(400),
    font(700),
    font(800),
    sharp(Buffer.from(markDocument(288))).png().toBuffer(),
  ]);

  const card = el(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      width: WIDTH,
      height: HEIGHT,
      padding: 80,
      background: "#FBF9FF",
      fontFamily: "Figtree",
      color: "#1B1B21",
    },
    [
      el("div", { display: "flex", alignItems: "center", gap: 22 }, [
        { type: "img", props: { src: `data:image/png;base64,${mark.toString("base64")}`, width: 96, height: 96 } },
        el("div", { fontSize: 48, fontWeight: 700, letterSpacing: -1 }, "Roolio"),
      ]),
      el("div", { display: "flex", flexDirection: "column", gap: 24 }, [
        // The title as on the homepage, with "bank" and "borrow" in the
        // colors the app gives them.
        el("div", { display: "flex", flexWrap: "wrap", fontSize: 80, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2.5 }, [
          "App time you can\u00A0",
          el("span", { color: "#2E7D5B" }, "bank"),
          "\u00A0and\u00A0",
          el("span", { color: "#A8452D" }, "borrow"),
          ".",
        ]),
        el(
          "div",
          { fontSize: 32, fontWeight: 400, color: "#47464F" },
          "Save the minutes you don't use. Borrow from tomorrow when you need more.",
        ),
      ]),
      usageRow(),
    ],
  );

  const svg = await satori(card as unknown as Parameters<typeof satori>[0], {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: "Figtree", data: regular, weight: 400, style: "normal" },
      { name: "Figtree", data: bold, weight: 700, style: "normal" },
      { name: "Figtree", data: extraBold, weight: 800, style: "normal" },
    ],
  });

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
