"use client";

import { downloadCsv, weekToCsv } from "@/lib/csv";
import type { WeekSnapshot } from "@/lib/types";

export function ExportButton({
  week,
  names,
  projectKey = "Proyecto",
}: {
  week: WeekSnapshot;
  names: Record<string, string>;
  projectKey?: string;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        downloadCsv(`pdse-${week.id}.csv`, weekToCsv(week, names, projectKey))
      }
      className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ink-soft"
    >
      Exportar CSV
    </button>
  );
}
