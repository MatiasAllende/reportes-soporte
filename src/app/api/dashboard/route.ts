import { NextResponse } from "next/server";
import {
  getDashboardMeta,
  getTechnicianNames,
  getAllWeeks,
} from "@/lib/data";
import { listTechnicians } from "@/lib/repositories/technicians";
import { getLatestSyncRun } from "@/lib/repositories/weeks";
import { hasJiraEnv } from "@/lib/env";
import { currentWeekId, listRecentWeekIds, rangeFromWeekId } from "@/lib/weeks";

export const runtime = "nodejs";

export async function GET() {
  const [weeks, technicians, names, meta, lastSync] = await Promise.all([
    getAllWeeks(),
    listTechnicians({ activeOnly: true }),
    getTechnicianNames(),
    getDashboardMeta(),
    getLatestSyncRun(),
  ]);

  const syncOptions = listRecentWeekIds(12).map((id) => {
    const range = rangeFromWeekId(id);
    return { id, ...range };
  });

  return NextResponse.json({
    weeks,
    technicians,
    names,
    meta,
    lastSync: lastSync ?? null,
    jiraConfigured: hasJiraEnv(),
    currentWeekId: currentWeekId(),
    syncOptions,
  });
}
