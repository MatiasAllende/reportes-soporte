"use client";

import { demoData } from "@/lib/data";

export function WeekSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (weekId: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-left sm:items-end">
      <span className="text-[11px] font-semibold tracking-[0.16em] text-ink-soft uppercase">
        Semana
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-[220px] rounded-md border border-[var(--line)] bg-white/80 px-3 py-2 text-sm font-medium text-ink shadow-none outline-none transition focus:border-teal"
      >
        {[...demoData.weeks].reverse().map((week) => (
          <option key={week.id} value={week.id}>
            {week.label}
          </option>
        ))}
      </select>
    </label>
  );
}
