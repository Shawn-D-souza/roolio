import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { type SQLiteDatabase, useSQLiteContext } from "expo-sqlite";
import { subscribeToBudgetChanges } from "../../budgets/events";

type Status = "loading" | "ready" | "error";

// Every period (day, week, month) starts at local midnight, so that's when
// usage resets. The extra second keeps the reload safely past the boundary.
function msUntilNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 1, 0);
  return midnight.getTime() - now.getTime();
}

/**
 * Loads budget data and reloads it after any committed budget write, when
 * Roolio returns to the foreground (usage only changes while other apps are
 * open), and at midnight, when a new period starts.
 * `load` must be stable (module-level or memoized); a new `load` reloads.
 */
export function useBudgetQuery<T>(
  load: (db: SQLiteDatabase) => Promise<T>,
  initialData: T,
) {
  const db = useSQLiteContext();
  const [data, setData] = useState<T>(initialData);
  const [status, setStatus] = useState<Status>("loading");
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    load(db)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setStatus("ready");
      })
      .catch(() => {
        // A failed background refresh keeps the data already on screen.
        if (!cancelled) {
          setStatus((current) => (current === "ready" ? current : "error"));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [db, load, version]);

  useEffect(() => subscribeToBudgetChanges(refresh), [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  // Shows the new period's numbers when the day changes while Roolio is open.
  // A timer that fires while Roolio is in the background is covered by the
  // "active" reload above.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        refresh();
        schedule();
      }, msUntilNextMidnight());
    };
    schedule();
    return () => clearTimeout(timer);
  }, [refresh]);

  const reload = useCallback(() => {
    setStatus("loading");
    refresh();
  }, [refresh]);

  return { data, status, reload };
}
