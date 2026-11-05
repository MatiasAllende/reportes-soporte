"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { applyIssueChange, type LiveIssue, type LiveNotice } from "@/lib/live-changes";
import type { StoredUnassignment } from "@/lib/repositories/unassignments";
import { listRecentWeekIds, rangeFromWeekId } from "@/lib/weeks";

function mergeWeek(
  current: StoredUnassignment[],
  incoming: StoredUnassignment[],
  weekId: string,
): StoredUnassignment[] {
  const next = new Map(
    current.filter((item) => item.weekId === weekId).map((item) => [item.id, item]),
  );
  for (const item of incoming) {
    if (item.weekId === weekId) next.set(item.id, item);
  }
  return [...next.values()].sort((a, b) => b.at.localeCompare(a.at));
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LivePage() {
  const weekIds = useMemo(() => [...listRecentWeekIds(12)].reverse(), []);
  const [weekId, setWeekId] = useState(weekIds[weekIds.length - 1] ?? "");
  const [issues, setIssues] = useState<LiveIssue[]>([]);
  const [notices, setNotices] = useState<LiveNotice[]>([]);
  const [unassignments, setUnassignments] = useState<StoredUnassignment[]>([]);
  const [weekWarning, setWeekWarning] = useState<string | null>(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const weekRef = useRef(weekId);
  weekRef.current = weekId;

  useEffect(() => {
    const saved = window.sessionStorage.getItem("pdse-selected-week");
    if (saved && weekIds.includes(saved)) setWeekId(saved);
  }, [weekIds]);

  useEffect(() => {
    if (!weekId) return;
    let cancelled = false;
    setUnassignments([]);
    setWeekLoading(true);
    void fetch(`/api/unassignments?weekId=${encodeURIComponent(weekId)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const json = (await res.json()) as {
          items?: StoredUnassignment[];
          warning?: string;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || "No se pudieron cargar las desasignaciones");
        setUnassignments(json.items ?? []);
        setWeekWarning(json.warning ?? null);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setWeekWarning(err instanceof Error ? err.message : "Error");
        }
      })
      .finally(() => {
        if (!cancelled) setWeekLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [weekId]);

  useEffect(() => {
    let previous: LiveIssue[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    async function poll() {
      try {
        const res = await fetch("/api/live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ previous }),
        });
        const json = (await res.json()) as {
          issues?: LiveIssue[];
          notices?: LiveNotice[];
          savedUnassignments?: StoredUnassignment[];
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || "No se pudo consultar Jira");
        const next = json.issues ?? [];
        const local = applyIssueChange(previous, next);
        const incoming = json.notices ?? [];
        const merged = [...incoming, ...local.filter((item) => !incoming.some((n) => n.id === item.id))];
        if (!stopped) {
          setIssues(next);
          const fresh = merged.filter(
            (notice) => previous.length > 0 && notice.kind !== "desasignado",
          );
          if (fresh.length > 0) {
            setNotices((current) => {
              const known = new Set(current.map((notice) => notice.id));
              return [...fresh.filter((notice) => !known.has(notice.id)), ...current].slice(0, 40);
            });
          }
          const saved = json.savedUnassignments ?? [];
          if (saved.length > 0) {
            const selected = weekRef.current;
            setUnassignments((current) => mergeWeek(current, saved, selected));
          }
          setError(null);
          previous = next;
        }
      } catch (err) {
        if (!stopped) setError(err instanceof Error ? err.message : "Error");
      } finally {
        if (!stopped) timer = setTimeout(() => void poll(), 20000);
      }
    }

    void poll();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  function selectWeek(id: string) {
    window.sessionStorage.setItem("pdse-selected-week", id);
    setWeekId(id);
  }

  return (
    <AppShell subtitle="Las desasignaciones quedan guardadas por semana. El resto se actualiza cada 20 segundos.">
      <section className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-green">
            En vivo
          </h2>
          <label className="flex flex-col gap-1 text-left sm:items-end">
            <span className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
              Semana
            </span>
            <select
              value={weekId}
              onChange={(event) => selectWeek(event.target.value)}
              className="min-w-[220px] rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-green"
            >
              {[...weekIds].reverse().map((id) => (
                <option key={id} value={id}>
                  {rangeFromWeekId(id).label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error ? <p className="text-sm text-amber">{error}</p> : null}
        <div>
          <h3 className="mb-3 text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
            Desasignaciones de la semana
          </h3>
          {weekWarning ? <p className="mb-2 text-sm text-amber">{weekWarning}</p> : null}
          {weekLoading && unassignments.length === 0 ? (
            <p className="text-sm text-ink-soft">Buscando desasignaciones de la semana…</p>
          ) : unassignments.length === 0 ? (
            <p className="text-sm text-ink-soft">Esta semana nadie se desasignó un ticket.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {unassignments.map((item) => (
                <li key={item.id} className="border-b border-[var(--line)] py-2">
                  <Link href={`/tickets/${item.key}`} className="font-semibold text-amber hover:underline">
                    {item.message}
                  </Link>
                  <p className="text-xs text-ink-soft">{formatWhen(item.at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
              Notificaciones
            </h3>
            {notices.length === 0 ? (
              <p className="text-sm text-ink-soft">Todavía no hubo cambios desde que abriste esta vista.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {notices.map((notice) => (
                  <li key={notice.id} className="border-b border-[var(--line)] py-2">
                    <Link href={`/tickets/${notice.key}`} className="font-semibold text-ink hover:text-green hover:underline">
                      {notice.message}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
              Actualizados ahora
            </h3>
            <ul className="space-y-2 text-sm">
              {issues.map((issue) => (
                <li key={issue.key} className="border-b border-[var(--line)] py-2">
                  <Link href={`/tickets/${issue.key}`} className="font-semibold text-green hover:underline">
                    {issue.key}
                  </Link>
                  <span className="text-ink"> {issue.summary}</span>
                  <p className="text-xs text-ink-soft">
                    {issue.status} · {issue.assignee ?? "Sin asignar"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
