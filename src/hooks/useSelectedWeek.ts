"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "pdse-selected-week";

/** `null` while weeks are still loading. Empty string when there are no weeks. */
export function useSelectedWeek(weekIdsKey: string | null) {
  const [weekId, setWeekIdState] = useState("");

  useEffect(() => {
    if (weekIdsKey === null) return;
    const weekIds = weekIdsKey ? weekIdsKey.split("|") : [];
    if (weekIds.length === 0) {
      setWeekIdState("");
      return;
    }
    const saved = window.sessionStorage.getItem(STORAGE_KEY);
    setWeekIdState(
      saved && weekIds.includes(saved) ? saved : weekIds[weekIds.length - 1],
    );
  }, [weekIdsKey]);

  function setWeekId(id: string) {
    window.sessionStorage.setItem(STORAGE_KEY, id);
    setWeekIdState(id);
  }

  return [weekId, setWeekId] as const;
}
