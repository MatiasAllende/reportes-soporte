"use client";

import { AppShell } from "@/components/AppShell";
import { TrendsChart } from "@/components/TrendsChart";
import { demoData } from "@/lib/data";

export default function TendenciasPage() {
  const latest = demoData.weeks[demoData.weeks.length - 1];
  const first = demoData.weeks[0];
  const backlogDelta = latest.open - first.open;
  const avgResolved =
    demoData.weeks.reduce((sum, week) => sum + week.resolved, 0) /
    demoData.weeks.length;

  return (
    <AppShell>
      <section className="space-y-8">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-ink">
            Tendencias
          </h2>
          <p className="mt-1 max-w-xl text-sm text-ink-soft">
            Últimas {demoData.weeks.length} semanas: creados, resueltos y
            backlog.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="animate-rise border-t-2 border-teal/40 pt-4">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
              Backlog vs inicio
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-ink">
              {backlogDelta > 0 ? `+${backlogDelta}` : backlogDelta}
            </p>
          </div>
          <div className="animate-rise delay-1 border-t-2 border-teal/40 pt-4">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
              Resueltos / semana
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-teal">
              {avgResolved.toFixed(0)}
            </p>
          </div>
          <div className="animate-rise delay-2 border-t-2 border-teal/40 pt-4">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
              Backlog actual
            </p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-ink">
              {latest.open}
            </p>
          </div>
        </div>

        <TrendsChart />
      </section>
    </AppShell>
  );
}
