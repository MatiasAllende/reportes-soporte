"use client";

import type { WeekSnapshot } from "@/lib/types";

export function WeekSelector({
  value,
  onChange,
  weeks,
}: {
  value: string;
  onChange: (weekId: string) => void;
  weeks: WeekSnapshot[];
}) {
  if (weeks.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Sin semanas guardadas. Sincronizá una desde el panel.
      </p>
    );
  }

  return (
    <label className="flex flex-col gap-1 text-left sm:items-end">
      <span className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
        Semana
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-[220px] rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-green"
      >
        {[...weeks].reverse().map((week) => (
          <option key={week.id} value={week.id}>
            {week.label}
          </option>
        ))}
      </select>
    </label>
  );
}
