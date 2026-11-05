"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { TechniciansChart } from "@/components/TechniciansChart";
import { TechniciansTable } from "@/components/TechniciansTable";
import { TrendsChart } from "@/components/TrendsChart";
import { WeekSelector } from "@/components/WeekSelector";
import { useDashboard } from "@/hooks/useDashboard";
import { useSelectedWeek } from "@/hooks/useSelectedWeek";
import { weekForActiveTechnicians } from "@/lib/data-client";

export default function TendenciasPage() {
  const { data, loading, error } = useDashboard();
  const weekIdsKey = data ? data.weeks.map((week) => week.id).join("|") : null;
  const [weekId, setWeekId] = useSelectedWeek(weekIdsKey);
  const week = useMemo(() => {
    const found = data?.weeks.find((item) => item.id === weekId);
    if (!found || !data) return found;
    const activeIds = data.technicians
      .filter((technician) => technician.active)
      .map((technician) => technician.id);
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

  const weeks = data.weeks;
  if (weeks.length === 0) {
    return (
      <AppShell projectKey={data.meta.projectKey} lastSyncAt={data.meta.lastSyncAt}>
        <p className="text-ink-soft">
          Sincronizá al menos una semana para ver tendencias.
        </p>
      </AppShell>
    );
  }

  const latest = weeks[weeks.length - 1];
  const first = weeks[0];
  const backlogDelta = latest.open - first.open;
  const avgResolved =
    weeks.reduce((sum, week) => sum + week.resolved, 0) / weeks.length;

  return (
    <AppShell
      projectKey={data.meta.projectKey}
      lastSyncAt={data.meta.lastSyncAt}
      weekControl={
        <WeekSelector value={weekId} onChange={setWeekId} weeks={data.weeks} />
      }
    >
      <section className="space-y-8">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-green">
            Tendencias
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            Últimas {weeks.length} semanas sincronizadas: creados, resueltos y
            backlog.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="animate-rise border-t-2 border-green/50 pt-4">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
              Backlog vs inicio
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-ink">
              {backlogDelta > 0 ? `+${backlogDelta}` : backlogDelta}
            </p>
          </div>
          <div className="animate-rise delay-1 border-t-2 border-green/50 pt-4">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
              Resueltos / semana
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-green">
              {avgResolved.toFixed(0)}
            </p>
          </div>
          <div className="animate-rise delay-2 border-t-2 border-green/50 pt-4">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
              Backlog actual
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-ink">
              {latest.open}
            </p>
          </div>
        </div>

        <TrendsChart weeks={weeks} />

        {week ? (
          <div className="space-y-6">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-green">
              Técnicos de {week.label}
            </h3>
            <TechniciansChart week={week} names={data.names} />
            <TechniciansTable week={week} names={data.names} />
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
