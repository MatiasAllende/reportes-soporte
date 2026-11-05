"use client";

import { useState } from "react";
import type { SyncOption } from "@/hooks/useDashboard";
import type { WeekSnapshot } from "@/lib/types";

export function SyncWeekButton({
  weekId,
  options,
  jiraConfigured,
  onSynced,
}: {
  weekId: string;
  options: SyncOption[];
  jiraConfigured: boolean;
  onSynced: (snapshot: WeekSnapshot) => void;
}) {
  const [selected, setSelected] = useState(weekId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekId: selected }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        snapshot?: WeekSnapshot;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.snapshot) {
        throw new Error(json.error || "Falló la sincronización");
      }
      setMessage(
        `Listo · ${json.snapshot.label}: ${json.snapshot.resolved} resueltos / ${json.snapshot.open} abiertos`,
      );
      onSynced(json.snapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al sincronizar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <label className="flex flex-col gap-1 text-left sm:items-end">
          <span className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
            Sincronizar
          </span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={busy || !jiraConfigured}
            className="min-w-[220px] rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-green disabled:opacity-50"
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={busy || !jiraConfigured}
          className="mt-5 rounded-md bg-green px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Sincronizando…" : "Sincronizar semana"}
        </button>
      </div>
      {!jiraConfigured ? (
        <p className="max-w-sm text-right text-xs text-amber">
          Configurá `.env.local` con las credenciales de Jira para sincronizar.
        </p>
      ) : null}
      {message ? (
        <p className="max-w-sm text-right text-xs text-green">{message}</p>
      ) : null}
      {error ? (
        <p className="max-w-sm text-right text-xs text-amber">{error}</p>
      ) : null}
    </div>
  );
}
