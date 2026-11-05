import { getJiraEnv, hasJiraEnv } from "@/lib/env";
import { listTechnicians } from "@/lib/repositories/technicians";
import {
  getLatestSyncRun,
  getWeekSnapshot,
  listWeekSnapshots,
} from "@/lib/repositories/weeks";
import type { DashboardMeta, WeekSnapshot } from "@/lib/types";

export function delta(
  current: number,
  previous: number | undefined,
): number | null {
  if (previous === undefined) return null;
  return current - previous;
}

export async function getDashboardMeta(): Promise<DashboardMeta> {
  const technicians = await listTechnicians({ activeOnly: true });
  const weeks = await listWeekSnapshots();
  const lastSync = await getLatestSyncRun();
  let projectKey = "Proyecto";
  let projectName = "Soporte";
  if (hasJiraEnv()) {
    const env = getJiraEnv();
    projectKey = env.projectKey;
    projectName = env.projectName;
  }
  return {
    projectKey,
    projectName,
    lastSyncAt: lastSync?.finishedAt ?? null,
    technicianCount: technicians.length,
    weekCount: weeks.length,
  };
}

export async function getAllWeeks(): Promise<WeekSnapshot[]> {
  return listWeekSnapshots();
}

export async function getLatestWeekId(): Promise<string | null> {
  const weeks = await listWeekSnapshots();
  if (weeks.length === 0) return null;
  return weeks[weeks.length - 1].id;
}

export async function getWeek(
  weekId: string,
): Promise<WeekSnapshot | undefined> {
  return getWeekSnapshot(weekId);
}

export async function getPreviousWeek(
  weekId: string,
): Promise<WeekSnapshot | undefined> {
  const weeks = await listWeekSnapshots();
  const index = weeks.findIndex((week) => week.id === weekId);
  if (index <= 0) return undefined;
  return weeks[index - 1];
}

export async function technicianName(id: string): Promise<string> {
  const technicians = await listTechnicians();
  return technicians.find((t) => t.id === id)?.name ?? id;
}

export async function getTechnicianNames(): Promise<Record<string, string>> {
  const technicians = await listTechnicians();
  return Object.fromEntries(technicians.map((t) => [t.id, t.name]));
}
