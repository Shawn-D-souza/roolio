import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import {
  getInstalledAppsAsync,
  InstalledApp,
} from "../../../modules/installed-apps";

type Status = "loading" | "ready" | "error";

export function useInstalledApps() {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = (isRefresh: boolean) => {
      getInstalledAppsAsync()
        .then((result) => {
          if (cancelled) return;
          setApps(result);
          setStatus("ready");
        })
        .catch(() => {
          // A failed background refresh keeps the list already on screen.
          if (!cancelled && !isRefresh) setStatus("error");
        });
    };

    load(false);

    // Apps may be installed, updated or removed while Roolio is in the
    // background; refresh quietly when the user comes back.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") load(true);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setStatus("loading");
    setAttempt((n) => n + 1);
  }, []);

  return { apps, status, reload };
}
