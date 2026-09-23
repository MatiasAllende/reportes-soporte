"use client";

import { downloadCsv, weekToCsv } from "@/lib/csv";
import type { WeekSnapshot } from "@/lib/types";

export function ExportButton({ week }: { week: WeekSnapshot }) {
  return (
    <button
      type="button"
      onClick={() =>
        downloadCsv(`pdse-${week.id}.csv`, weekToCsv(week))
      }
      className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-soft"
    >
      Exportar CSV
    </button>
  );
}
