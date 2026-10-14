import { useCallback, useEffect, useState } from "react";
import { type SQLiteDatabase, useSQLiteContext } from "expo-sqlite";
import { subscribeToBudgetChanges } from "../../budgets/events";

type Status = "loading" | "ready" | "error";

/**
 * Loads budget data and reloads it after any committed budget write.
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

  const reload = useCallback(() => {
    setStatus("loading");
    refresh();
  }, [refresh]);

  return { data, status, reload };
}
