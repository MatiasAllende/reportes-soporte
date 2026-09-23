"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ExportButton } from "@/components/ExportButton";
import { TechniciansChart } from "@/components/TechniciansChart";
import { TechniciansTable } from "@/components/TechniciansTable";
import { WeekSelector } from "@/components/WeekSelector";
import { getLatestWeekId, getWeek, technicianName } from "@/lib/data";

export default function TecnicosPage() {
  const [weekId, setWeekId] = useState(getLatestWeekId);
  const week = useMemo(() => getWeek(weekId)!, [weekId]);

  const fastest = [...week.byTechnician].sort(
    (a, b) => a.avgResolutionDays - b.avgResolutionDays
  )[0];
  const mostResolved = [...week.byTechnician].sort(
    (a, b) => b.resolved - a.resolved
  )[0];

  return (
    <AppShell
      weekControl={<WeekSelector value={weekId} onChange={setWeekId} />}
      actions={<ExportButton week={week} />}
    >
      <section className="space-y-8">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-ink">
            Técnicos
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            Miramos throughput, carga abierta y tiempo medio juntos — no solo
            cantidad resuelta.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="animate-rise border-t-2 border-teal/40 pt-4">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
              Más resueltos
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">
              {technicianName(mostResolved.id)}
            </p>
            <p className="text-sm text-teal">{mostResolved.resolved} tickets</p>
          </div>
          <div className="animate-rise delay-1 border-t-2 border-teal/40 pt-4">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
              Resolución más rápida
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold">
              {technicianName(fastest.id)}
            </p>
            <p className="text-sm text-teal">
              {fastest.avgResolutionDays.toFixed(1)} días promedio
            </p>
          </div>
        </div>

        <TechniciansChart week={week} />
        <TechniciansTable week={week} />
      </section>
    </AppShell>
  );
}
