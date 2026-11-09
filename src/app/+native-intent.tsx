import type { NativeIntent } from "expo-router";
import { getScreenMemory, isPremium } from "../../modules/roolio-core";

// "roolio:///", or the development client's own launch link: Roolio opened
// from the launcher rather than a link to a screen.
function isRoot(path: string) {
  const route = path
    .replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*/i, "")
    .replace(/[?#].*$/, "");
  return route === "" || route === "/";
}

// Roolio opens on the tab the user last left, Home or Stats, unless Stats is
// locked. A link to a screen still opens that screen.
export const redirectSystemPath: NativeIntent["redirectSystemPath"] = ({
  path,
  initial,
}) => {
  try {
    if (
      initial &&
      isRoot(path) &&
      getScreenMemory().tab === "stats" &&
      isPremium()
    ) {
      return "/stats";
    }
  } catch {
    // Without the saved tab, Roolio opens as usual.
  }
  return path;
};
