"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useDashboard } from "@/hooks/useDashboard";
import { useSelectedWeek } from "@/hooks/useSelectedWeek";
import type { ResolutionRankRow } from "@/lib/resolution-rank";
import { listRecentWeekIds, listRecentMonthIds, rangeFromMonthId, rangeFromWeekId } from "@/lib/weeks";

function RankList({
  title,
  rows,
}: {
  title: string;
  rows: ResolutionRankRow[];
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft">No hay suficientes técnicos para este grupo.</p>
      ) : (
        rows.map((row, index) => (
          <article key={row.id} className="border-t-2 border-green/50 pt-4">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
              {index + 1}
            </p>
            <Link
              href={`/tecnicos/${row.id}`}
              className="mt-1 block font-[family-name:var(--font-display)] text-2xl font-bold text-ink hover:text-green hover:underline"
            >
              {row.name}
            </Link>
            <p className="text-sm text-green">{row.resolved} con resolución</p>
            {row.byResolution.length > 0 ? (
              <p className="mt-1 text-sm text-ink-soft">
                {row.byResolution.map((item) => `${item.name} ${item.count}`).join(" · ")}
              </p>
            ) : null}
            {row.tickets.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm">
                {row.tickets.map((ticket) => (
                  <li key={ticket.key}>
                    <Link href={`/tickets/${ticket.key}`} className="font-semibold text-green hover:underline">
                      {ticket.key}
                    </Link>
                    <span className="text-ink"> {ticket.summary}</span>
                    <span className="text-ink-soft"> · {ticket.resolution}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-soft">Ningún ticket con resolución en este período.</p>
            )}
          </article>
        ))
      )}
    </div>
  );
}

function MonthList({ rows }: { rows: ResolutionRankRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-ink-soft">Este mes nadie tiene tickets con resolución.</p>;
  }

  return (
    <ol className="space-y-4">
      {rows.map((row, index) => (
        <li key={row.id} className="border-t-2 border-green/50 pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
                {index + 1}
              </p>
              <Link
                href={`/tecnicos/${row.id}`}
                className="font-[family-name:var(--font-display)] text-2xl font-bold text-ink hover:text-green hover:underline"
              >
                {row.name}
              </Link>
            </div>
            <p className="text-sm text-green">{row.resolved} con resolución</p>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {row.byResolution.map((item) => `${item.name} ${item.count}`).join(" · ")}
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-sm font-semibold text-ink hover:text-green">
              Ver tickets
            </summary>
            <ul className="mt-2 space-y-1 text-sm">
              {row.tickets.map((ticket) => (
                <li key={ticket.key}>
                  <Link href={`/tickets/${ticket.key}`} className="font-semibold text-green hover:underline">
                    {ticket.key}
                  </Link>
                  <span className="text-ink"> {ticket.summary}</span>
                  <span className="text-ink-soft"> · {ticket.resolution}</span>
                </li>
              ))}
            </ul>
          </details>
        </li>
      ))}
    </ol>
  );
}

export default function ResolutionsPage() {
  const { data } = useDashboard();
  const weekIds = useMemo(() => {
    const ids = new Set([...listRecentWeekIds(12)].reverse());
    for (const week of data?.weeks ?? []) ids.add(week.id);
    return [...ids].sort();
  }, [data]);
  const monthIds = useMemo(() => [...listRecentMonthIds(12)].reverse(), []);
  const [period, setPeriod] = useState<"week" | "month">("month");
  const [monthId, setMonthId] = useState(monthIds[monthIds.length - 1] ?? "");
  const [weekId, setWeekId] = useSelectedWeek(weekIds.join("|"));
  const [most, setMost] = useState<ResolutionRankRow[]>([]);
  const [least, setLeast] = useState<ResolutionRankRow[]>([]);
  const [othersWithLeast, setOthersWithLeast] = useState(0);
  const [withoutResolution, setWithoutResolution] = useState(0);
  const [monthRows, setMonthRows] = useState<ResolutionRankRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.sessionStorage.getItem("pdse-selected-month");
    if (saved && monthIds.includes(saved)) setMonthId(saved);
  }, [monthIds]);

  useEffect(() => {
    if (period !== "week" || !weekId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetch(`/api/resolutions/week?weekId=${encodeURIComponent(weekId)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const json = (await res.json()) as {
          most?: ResolutionRankRow[];
          least?: ResolutionRankRow[];
          othersWithLeast?: number;
          withoutResolution?: number;
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || "No se pudo consultar Jira");
        if (cancelled) return;
        setMost(json.most ?? []);
        setLeast(json.least ?? []);
        setOthersWithLeast(json.othersWithLeast ?? 0);
        setWithoutResolution(json.withoutResolution ?? 0);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, weekId]);

  useEffect(() => {
    if (period !== "month" || !monthId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetch(`/api/resolutions/month?monthId=${encodeURIComponent(monthId)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const json = (await res.json()) as {
          rows?: ResolutionRankRow[];
          error?: string;
        };
        if (!res.ok) throw new Error(json.error || "No se pudo consultar Jira");
        if (cancelled) return;
        setMonthRows(json.rows ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, monthId]);

  function selectMonth(id: string) {
    window.sessionStorage.setItem("pdse-selected-month", id);
    setMonthId(id);
  }

  return (
    <AppShell
      subtitle="Quiénes cierran más y menos tickets, según el campo Resolución de Jira."
      projectKey={data?.meta.projectKey}
      lastSyncAt={data?.meta.lastSyncAt}
      weekControl={
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex gap-1" role="tablist" aria-label="Período">
            {(["month", "week"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                  period === value ? "bg-green text-white" : "text-ink-soft hover:text-ink"
                }`}
              >
                {value === "month" ? "Mes" : "Semana"}
              </button>
            ))}
          </div>
          {period === "month" ? (
            <label className="flex flex-col gap-1 text-left sm:items-end">
              <span className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
                Mes
              </span>
              <select
                value={monthId}
                onChange={(event) => selectMonth(event.target.value)}
                className="min-w-[220px] rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-green"
              >
                {[...monthIds].reverse().map((id) => (
                  <option key={id} value={id}>
                    {rangeFromMonthId(id).label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="flex flex-col gap-1 text-left sm:items-end">
              <span className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
                Semana
              </span>
              <select
                value={weekId}
                onChange={(event) => setWeekId(event.target.value)}
                className="min-w-[220px] rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-green"
              >
                {weekIds.map((id) => (
                  <option key={id} value={id}>
                    {data?.weeks.find((week) => week.id === id)?.label ?? rangeFromWeekId(id).label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      }
    >
      <section className="space-y-8">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-green">
            Resoluciones
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            {period === "month"
              ? "Listado del mes, de quien más resolvió a quien menos. Cada ticket cuenta si tiene resolución."
              : "Entran los tickets de la semana que tienen resolución. Al lado de cada uno se ve con cuál se cerró."}
          </p>
        </div>
        {error ? <p className="text-sm text-amber">{error}</p> : null}
        {loading ? (
          <p className="text-sm text-ink-soft">
            {period === "month" ? "Buscando resoluciones del mes…" : "Buscando resoluciones en Jira…"}
          </p>
        ) : null}
        {!loading && !error && period === "month" ? <MonthList rows={monthRows} /> : null}
        {!loading && !error && period === "week" ? (
          <div className="grid gap-10 lg:grid-cols-2">
            <RankList title="Los 3 que más resuelven" rows={most} />
            <div className="space-y-3">
              <RankList title="Los 3 que menos resuelven" rows={least} />
              {withoutResolution > 0 ? (
                <p className="text-sm text-ink-soft">
                  {withoutResolution} técnicos no tienen ningún ticket con resolución esta semana.
                  {least.length > 0
                    ? " La lista de arriba son quienes menos cerraron entre los que sí resolvieron alguno."
                    : null}
                </p>
              ) : null}
              {othersWithLeast > 0 ? (
                <p className="text-sm text-ink-soft">
                  Hay {othersWithLeast} técnicos más con esa misma cantidad mínima.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
