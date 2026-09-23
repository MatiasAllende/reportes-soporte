"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ExportButton } from "@/components/ExportButton";
import { KpiRow } from "@/components/KpiRow";
import { TechniciansChart } from "@/components/TechniciansChart";
import { TechniciansTable } from "@/components/TechniciansTable";
import { WeekSelector } from "@/components/WeekSelector";
import { delta, getLatestWeekId, getPreviousWeek, getWeek } from "@/lib/data";

export default function HomePage() {
  const [weekId, setWeekId] = useState(getLatestWeekId);
  const week = useMemo(() => getWeek(weekId)!, [weekId]);
  const previous = useMemo(() => getPreviousWeek(weekId), [weekId]);

  return (
    <AppShell
      weekControl={<WeekSelector value={weekId} onChange={setWeekId} />}
      actions={<ExportButton week={week} />}
    >
      <section className="space-y-10">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-ink">
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
              hint: "Cerrados en el período",
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
            <TechniciansChart week={week} />
          </div>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold tracking-[0.14em] text-ink-soft uppercase">
              Señales operativas
            </h3>
            <ul className="animate-rise delay-3 space-y-3 text-sm text-ink-soft">
              <li className="flex justify-between border-b border-[var(--line)] py-2">
                <span>Estancados (&gt; N días)</span>
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
          <TechniciansTable week={week} />
        </div>
      </section>
    </AppShell>
  );
}
