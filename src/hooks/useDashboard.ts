"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardMeta, SyncRun, Technician, WeekSnapshot } from "@/lib/types";

export type SyncOption = {
  id: string;
  start: string;
  end: string;
  label: string;
};

export type DashboardPayload = {
  weeks: WeekSnapshot[];
  technicians: Technician[];
  names: Record<string, string>;
  meta: DashboardMeta;
  lastSync: SyncRun | null;
  jiraConfigured: boolean;
  currentWeekId: string;
  syncOptions: SyncOption[];
};

export function useDashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("No se pudo cargar el dashboard");
      }
      const json = (await res.json()) as DashboardPayload;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de carga");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
