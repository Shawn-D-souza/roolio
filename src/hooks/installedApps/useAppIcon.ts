import { useEffect, useState } from "react";
import { getAppIconAsync } from "../../../modules/installed-apps";

type CachedIcon = { updatedAt: number; uri: string | null };

// Session-wide caches.
const resolvedIcons = new Map<string, CachedIcon>();
const pendingIcons = new Map<string, Promise<string | null>>();

function loadIcon(packageName: string, updatedAt: number) {
  const key = `${packageName}:${updatedAt}`;
  let pending = pendingIcons.get(key);
  if (!pending) {
    pending = getAppIconAsync(packageName)
      .then((result) => {
        const uri = result || null;
        resolvedIcons.set(packageName, { updatedAt, uri });
        return uri;
      })
      // Uninstalled mid-load or failed to render: fall back to the placeholder.
      .catch(() => null)
      .finally(() => pendingIcons.delete(key));
    pendingIcons.set(key, pending);
  }
  return pending;
}

function getCachedIcon(packageName: string, updatedAt: number) {
  const cached = resolvedIcons.get(packageName);
  return cached?.updatedAt === updatedAt ? cached : undefined;
}

/** Drops a cached icon, e.g. when its file can no longer be displayed. */
export function evictAppIcon(packageName: string) {
  resolvedIcons.delete(packageName);
}

type LoadedIcon = { key: string; uri: string | null };

export function useAppIcon(
  packageName: string,
  updatedAt: number,
): string | null {
  const key = `${packageName}:${updatedAt}`;
  const cached = getCachedIcon(packageName, updatedAt);
  const [icon, setIcon] = useState<LoadedIcon | null>(null);

  useEffect(() => {
    if (getCachedIcon(packageName, updatedAt)) return;
    let cancelled = false;

    loadIcon(packageName, updatedAt).then((uri) => {
      if (!cancelled) setIcon({ key: `${packageName}:${updatedAt}`, uri });
    });

    return () => {
      cancelled = true;
    };
  }, [packageName, updatedAt]);

  if (cached) return cached.uri;
  // Ignore an icon loaded for a previous app or version (e.g. a recycled row).
  return icon?.key === key ? icon.uri : null;
}
