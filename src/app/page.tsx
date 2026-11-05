"use client";

import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { ExportButton } from "@/components/ExportButton";
import { KpiRow } from "@/components/KpiRow";
import { SyncWeekButton } from "@/components/SyncWeekButton";
import { TechniciansChart } from "@/components/TechniciansChart";
import { TechniciansTable } from "@/components/TechniciansTable";
import { WeekSelector } from "@/components/WeekSelector";
import { useDashboard } from "@/hooks/useDashboard";
import { useSelectedWeek } from "@/hooks/useSelectedWeek";
import { delta, weekForActiveTechnicians } from "@/lib/data-client";

export default function HomePage() {
  const { data, loading, error, refresh } = useDashboard();
  const weekIdsKey = data ? data.weeks.map((week) => week.id).join("|") : null;
  const [weekId, setWeekId] = useSelectedWeek(weekIdsKey);

  const week = useMemo(() => {
    const found = data?.weeks.find((w) => w.id === weekId);
    if (!found || !data) return found;
    const activeIds = data.technicians.filter((t) => t.active).map((t) => t.id);
    return weekForActiveTechnicians(found, activeIds);
  }, [data, weekId]);
  const previous = useMemo(() => {
    if (!data || !weekId) return undefined;
    const index = data.weeks.findIndex((w) => w.id === weekId);
    if (index <= 0) return undefined;
    return data.weeks[index - 1];
  }, [data, weekId]);

  if (loading && !data) {
    return (
      <AppShell>
        <p className="text-ink-soft">Cargando dashboard…</p>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <p className="text-amber">{error ?? "No se pudo cargar"}</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      projectKey={data.meta.projectKey}
      lastSyncAt={data.meta.lastSyncAt}
      weekControl={
        week ? (
          <WeekSelector
            value={weekId}
            onChange={setWeekId}
            weeks={data.weeks}
          />
        ) : undefined
      }
      actions={
        <div className="flex flex-col items-start gap-3 sm:items-end">
          {week ? (
            <ExportButton
              week={week}
              names={data.names}
              projectKey={data.meta.projectKey}
            />
          ) : null}
          <SyncWeekButton
            weekId={data.currentWeekId}
            options={data.syncOptions}
            jiraConfigured={data.jiraConfigured}
            onSynced={() => void refresh()}
          />
        </div>
      }
    >
      {!week ? (
        <section className="space-y-4">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-green">
            Empezá por sincronizar
          </h2>
          <p className="max-w-xl text-sm text-ink-soft">
            Importá técnicos en Admin y después sincronizá una semana con Jira.
            Cada sincronización guarda un cierre semanal local.
          </p>
        </section>
      ) : (
        <section className="space-y-10">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-green">
              Resumen de la semana
            </h2>
            <p className="mt-1 text-sm text-ink-soft">{week.label}</p>
          </div>

          <KpiRow
            items={[
              {
                label: "Backlog abierto",
                value: week.open,
                delta: delta(week.open, previous?.open),
                hint: "Tickets sin cerrar",
              },
              {
                label: "Resueltos",
                value: week.resolved,
                delta: delta(week.resolved, previous?.resolved),
                tone: "good",
                hint: "Categoría Done en el período",
              },
              {
                label: "Creados",
                value: week.created,
                delta: delta(week.created, previous?.created),
                hint: "Entrada nueva",
              },
              {
                label: "Neto semana",
                value: week.created - week.resolved,
                hint:
                  week.created - week.resolved <= 0
                    ? "Se bajó backlog"
                    : "Subió backlog",
                tone: week.created - week.resolved <= 0 ? "good" : "warn",
              },
            ]}
          />

          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <h3 className="mb-4 text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
                Carga por técnico
              </h3>
              <TechniciansChart week={week} names={data.names} />
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
                Señales operativas
              </h3>
              <ul className="animate-rise delay-3 space-y-3 text-sm text-ink-soft">
                <li className="flex justify-between border-b border-[var(--line)] py-2">
                  <span>Estancados (&gt; 3 días)</span>
                  <strong className="text-ink">{week.stale}</strong>
                </li>
                <li className="flex justify-between border-b border-[var(--line)] py-2">
                  <span>Sin asignar</span>
                  <strong className="text-ink">{week.unassigned}</strong>
                </li>
                <li className="flex justify-between border-b border-[var(--line)] py-2">
                  <span>Reabiertos</span>
                  <strong className="text-ink">{week.reopened}</strong>
                </li>
              </ul>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
              Detalle técnicos
            </h3>
            <TechniciansTable week={week} names={data.names} />
          </div>
        </section>
      )}
    </AppShell>
  );
}
