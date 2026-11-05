/** Client-safe helpers (no Node / SQLite imports). */

import type { WeekSnapshot } from "./types";

export function delta(
  current: number,
  previous: number | undefined,
): number | null {
  if (previous === undefined) return null;
  return current - previous;
}

export function weekForActiveTechnicians(
  week: WeekSnapshot,
  activeIds: string[],
): WeekSnapshot {
  const ids = new Set(activeIds);
  return {
    ...week,
    byTechnician: week.byTechnician.filter((row) => ids.has(row.id)),
  };
}
