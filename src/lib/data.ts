import demo from "../../data/demo.json";
import type { DemoData, WeekSnapshot } from "./types";

export const demoData = demo as DemoData;

export function getLatestWeekId(): string {
  return demoData.weeks[demoData.weeks.length - 1].id;
}

export function getWeek(weekId: string): WeekSnapshot | undefined {
  return demoData.weeks.find((week) => week.id === weekId);
}

export function getPreviousWeek(weekId: string): WeekSnapshot | undefined {
  const index = demoData.weeks.findIndex((week) => week.id === weekId);
  if (index <= 0) return undefined;
  return demoData.weeks[index - 1];
}

export function technicianName(id: string): string {
  return demoData.technicians.find((t) => t.id === id)?.name ?? id;
}

export function delta(current: number, previous: number | undefined): number | null {
  if (previous === undefined) return null;
  return current - previous;
}
