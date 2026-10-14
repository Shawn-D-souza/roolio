type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Subscribes to committed budget writes. Emitted after a write resolves, so
 * listeners always read committed data (SQLite's update hook fires earlier,
 * before an exclusive transaction commits).
 */
export function subscribeToBudgetChanges(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyBudgetsChanged() {
  listeners.forEach((listener) => listener());
}
