"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ExportButton } from "@/components/ExportButton";
import { TechniciansChart } from "@/components/TechniciansChart";
import { TechniciansTable } from "@/components/TechniciansTable";
import { WeekSelector } from "@/components/WeekSelector";
import { useDashboard } from "@/hooks/useDashboard";
import { useSelectedWeek } from "@/hooks/useSelectedWeek";
import { weekForActiveTechnicians } from "@/lib/data-client";

export default function TecnicosPage() {
  const { data, loading, error } = useDashboard();
  const weekIdsKey = data ? data.weeks.map((week) => week.id).join("|") : null;
  const [weekId, setWeekId] = useSelectedWeek(weekIdsKey);
  const [sla, setSla] = useState<{
    met: { id: string; name: string; met: number; breached: number }[];
    breached: { id: string; name: string; met: number; breached: number }[];
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!weekId) return;
    void fetch(`/api/sla/week?weekId=${encodeURIComponent(weekId)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const json = (await res.json()) as {
          met?: { id: string; name: string; met: number; breached: number }[];
          breached?: { id: string; name: string; met: number; breached: number }[];
          error?: string;
        };
        setSla({
          met: json.met ?? [],
          breached: json.breached ?? [],
          error: res.ok ? undefined : json.error,
        });
      })
      .catch(() => setSla({ met: [], breached: [], error: "No se pudo leer el SLA" }));
  }, [weekId]);

  const week = useMemo(() => {
    const found = data?.weeks.find((w) => w.id === weekId);
    if (!found || !data) return found;
    const activeIds = data.technicians.filter((t) => t.active).map((t) => t.id);
    return weekForActiveTechnicians(found, activeIds);
  }, [data, weekId]);

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

  if (!week) {
    return (
      <AppShell projectKey={data.meta.projectKey} lastSyncAt={data.meta.lastSyncAt}>
        <p className="text-ink-soft">
          No hay semanas sincronizadas todavía.
        </p>
      </AppShell>
    );
  }

  const fastest = [...week.byTechnician].sort(
    (a, b) => a.avgResolutionDays - b.avgResolutionDays,
  )[0];
  const mostResolved = [...week.byTechnician].sort(
    (a, b) => b.resolved - a.resolved,
  )[0];

  return (
    <AppShell
      projectKey={data.meta.projectKey}
      lastSyncAt={data.meta.lastSyncAt}
      weekControl={
        <WeekSelector value={weekId} onChange={setWeekId} weeks={data.weeks} />
      }
      actions={
        <ExportButton
          week={week}
          names={data.names}
          projectKey={data.meta.projectKey}
        />
      }
    >
      <section className="space-y-8">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-green">
            Técnicos
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            Throughput, carga abierta y tiempo medio juntos — no solo cantidad
            resuelta.
          </p>
        </div>

        {week.byTechnician.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="animate-rise border-t-2 border-green/50 pt-4">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
                Más resueltos
              </p>
              <Link
                href={`/tecnicos/${mostResolved.id}`}
                className="mt-2 block font-[family-name:var(--font-display)] text-3xl font-bold text-ink hover:text-green hover:underline"
              >
                {data.names[mostResolved.id] ?? mostResolved.id}
              </Link>
              <p className="text-sm text-green">
                {mostResolved.resolved} tickets
              </p>
            </div>
            <div className="animate-rise delay-1 border-t-2 border-green/50 pt-4">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
                Resolución más rápida
              </p>
              <Link
                href={`/tecnicos/${fastest.id}`}
                className="mt-2 block font-[family-name:var(--font-display)] text-3xl font-bold text-ink hover:text-green hover:underline"
              >
                {data.names[fastest.id] ?? fastest.id}
              </Link>
              <p className="text-sm text-green">
                {fastest.avgResolutionDays.toFixed(1)} días promedio
              </p>
            </div>
          </div>
        ) : null}

        {sla ? (
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
                SLA cumplido
              </h3>
              {sla.error ? <p className="text-sm text-amber">{sla.error}</p> : null}
              <ul className="space-y-2 text-sm">
                {sla.met.map((row) => (
                  <li key={row.id} className="flex justify-between border-b border-[var(--line)] py-2">
                    <Link href={`/tecnicos/${row.id}`} className="font-semibold hover:text-green hover:underline">
                      {row.name}
                    </Link>
                    <span className="text-green">{row.met}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
                SLA vencido
              </h3>
              <ul className="space-y-2 text-sm">
                {sla.breached.map((row) => (
                  <li key={row.id} className="flex justify-between border-b border-[var(--line)] py-2">
                    <Link href={`/tecnicos/${row.id}`} className="font-semibold hover:text-green hover:underline">
                      {row.name}
                    </Link>
                    <span className="text-amber">{row.breached}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        <TechniciansChart week={week} names={data.names} />
        <TechniciansTable week={week} names={data.names} />
      </section>
    </AppShell>
  );
}
