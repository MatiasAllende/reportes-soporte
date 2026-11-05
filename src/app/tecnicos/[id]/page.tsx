"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { TechnicianWeeklyChart } from "@/components/TechnicianWeeklyChart";
import { useDashboard } from "@/hooks/useDashboard";
import type { ResolvedIssue } from "@/lib/types";

export default function TechnicianDetailPage() {
  const { data, loading, error } = useDashboard();
  const params = useParams<{ id: string }>();
  const technicianId = params.id;
  const [issues, setIssues] = useState<ResolvedIssue[]>([]);

  useEffect(() => {
    if (!technicianId) return;
    let cancelled = false;
    void fetch(`/api/technicians/${technicianId}/issues`, { cache: "no-store" })
      .then((res) => res.json())
      .then((json: { issues?: ResolvedIssue[] }) => {
        if (!cancelled) setIssues(json.issues ?? []);
      })
      .catch(() => {
        if (!cancelled) setIssues([]);
      });
    return () => {
      cancelled = true;
    };
  }, [technicianId]);

  const technician = useMemo(
    () => data?.technicians.find((t) => t.id === technicianId),
    [data, technicianId],
  );

  const history = useMemo(() => {
    if (!data) return [];
    return data.weeks
      .map((week) => {
        const stats = week.byTechnician.find((row) => row.id === technicianId);
        if (!stats) return null;
        return { week, stats };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [data, technicianId]);

  const totals = useMemo(() => {
    if (history.length === 0) {
      return { resolved: 0, created: 0, avgResolutionDays: 0, latestOpen: 0 };
    }
    const resolved = history.reduce((sum, h) => sum + h.stats.resolved, 0);
    const created = history.reduce((sum, h) => sum + h.stats.created, 0);
    const weightedDays = history.reduce(
      (sum, h) => sum + h.stats.avgResolutionDays * h.stats.resolved,
      0,
    );
    const avgResolutionDays = resolved > 0 ? weightedDays / resolved : 0;
    const latestOpen = history[history.length - 1].stats.open;
    return { resolved, created, avgResolutionDays, latestOpen };
  }, [history]);

  if (loading && !data) {
    return (
      <AppShell>
        <p className="text-ink-soft">Cargando…</p>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <p className="text-amber">{error ?? "Error"}</p>
      </AppShell>
    );
  }

  if (!technician) {
    return (
      <AppShell projectKey={data.meta.projectKey} lastSyncAt={data.meta.lastSyncAt}>
        <div className="space-y-4">
          <p className="text-ink-soft">No encontramos ese técnico.</p>
          <Link
            href="/tecnicos"
            className="text-sm font-semibold text-green underline-offset-2 hover:underline"
          >
            ← Volver a Técnicos
          </Link>
        </div>
      </AppShell>
    );
  }

  const chartData = history.map(({ week, stats }) => ({
    name: week.id.replace(/^\d{4}-/, ""),
    Resueltos: stats.resolved,
    Abiertos: stats.open,
    Creados: stats.created,
  }));

  return (
    <AppShell
      projectKey={data.meta.projectKey}
      lastSyncAt={data.meta.lastSyncAt}
      subtitle="Detalle histórico por técnico."
    >
      <section className="space-y-8">
        <div>
          <Link
            href="/tecnicos"
            className="text-xs font-semibold tracking-[0.16em] text-ink-soft uppercase hover:text-green"
          >
            ← Técnicos
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-green">
              {technician.name}
            </h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                technician.active
                  ? "bg-green-soft text-green-dark"
                  : "bg-mist text-ink-soft"
              }`}
            >
              {technician.active ? "Activo" : "Inactivo"}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {technician.team ? `Equipo ${technician.team} · ` : ""}
            {history.length} semana{history.length === 1 ? "" : "s"} con datos
          </p>
        </div>

        {history.length === 0 ? (
          <p className="text-ink-soft">
            Este técnico todavía no tiene semanas sincronizadas.
          </p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="animate-rise border-t-2 border-green/50 pt-4">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
                  Resueltos (total)
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-green">
                  {totals.resolved}
                </p>
              </div>
              <div className="animate-rise delay-1 border-t-2 border-green/50 pt-4">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
                  Creados asignados (total)
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-ink">
                  {totals.created}
                </p>
              </div>
              <div className="animate-rise delay-2 border-t-2 border-green/50 pt-4">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
                  Resolución media
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-ink">
                  {totals.avgResolutionDays.toFixed(1)} d
                </p>
              </div>
              <div className="animate-rise delay-3 border-t-2 border-green/50 pt-4">
                <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
                  Abiertos (última semana)
                </p>
                <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-ink">
                  {totals.latestOpen}
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
                Evolución semanal
              </h3>
              <TechnicianWeeklyChart data={chartData} />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
                Detalle por semana
              </h3>
              <div className="animate-rise delay-3 overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-[11px] tracking-[0.14em] text-ink-soft uppercase">
                      <th className="py-3 pr-4 font-semibold">Semana</th>
                      <th className="py-3 pr-4 font-semibold">Resueltos</th>
                      <th className="py-3 pr-4 font-semibold">Abiertos</th>
                      <th className="py-3 pr-4 font-semibold">Creados asig.</th>
                      <th className="py-3 font-semibold">Resolución media</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...history].reverse().map(({ week, stats }) => {
                      const weekIssues = issues.filter(
                        (issue) => issue.weekId === week.id,
                      );
                      return (
                        <tr
                          key={week.id}
                          className="border-b border-[var(--line)] last:border-none align-top"
                        >
                          <td className="py-3.5 pr-4 font-semibold text-ink">
                            {week.label}
                            {weekIssues.length > 0 ? (
                              <ul className="mt-2 space-y-1 font-normal">
                                {weekIssues.map((issue) => (
                                  <li key={issue.issueKey}>
                                    <Link
                                      href={`/tickets/${issue.issueKey}`}
                                      className="font-semibold text-green hover:underline"
                                    >
                                      {issue.issueKey}
                                    </Link>
                                    <span className="text-ink-soft">
                                      {" "}
                                      {issue.summary}
                                      {issue.resolution ? ` · ${issue.resolution}` : ""}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : stats.resolved > 0 ? (
                              <p className="mt-2 font-normal text-xs text-ink-soft">
                                Sincronizá de nuevo esta semana para ver los
                                tickets.
                              </p>
                            ) : null}
                          </td>
                          <td className="py-3.5 pr-4 text-green">
                            {stats.resolved}
                          </td>
                          <td className="py-3.5 pr-4">{stats.open}</td>
                          <td className="py-3.5 pr-4">{stats.created}</td>
                          <td className="py-3.5">
                            {stats.avgResolutionDays.toFixed(1)} d
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}
