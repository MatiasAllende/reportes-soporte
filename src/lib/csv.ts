import type { WeekSnapshot } from "./types";

function escapeCell(value: string | number): string {
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function weekToCsv(
  week: WeekSnapshot,
  names: Record<string, string>,
  projectKey = "Proyecto",
): string {
  const header = [
    "semana",
    "tecnico",
    "abiertos",
    "resueltos",
    "creados",
    "dias_resolucion_promedio",
  ];

  const rows = week.byTechnician.map((row) =>
    [
      week.id,
      names[row.id] ?? row.id,
      row.open,
      row.resolved,
      row.created,
      row.avgResolutionDays,
    ]
      .map(escapeCell)
      .join(","),
  );

  const summary = [
    "",
    `Proyecto,${projectKey}`,
    `Periodo,${week.label}`,
    `Creados,${week.created}`,
    `Resueltos,${week.resolved}`,
    `Backlog abierto,${week.open}`,
    `Estancados,${week.stale}`,
    `Sin asignar,${week.unassigned}`,
    `Reabiertos,${week.reopened}`,
    week.syncedAt ? `Sincronizado,${week.syncedAt}` : "",
    "",
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  return `${summary}${header.join(",")}\n${rows.join("\n")}\n`;
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
