import { NextResponse } from "next/server";
import { EnvError } from "@/lib/env";
import { JiraApiError } from "@/lib/jira/client";
import { syncWeekFromJira } from "@/lib/jira/sync-week";
import { currentWeekId } from "@/lib/weeks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      weekId?: string;
    };
    const weekId = body.weekId?.trim() || currentWeekId();
    const snapshot = await syncWeekFromJira(weekId);
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al sincronizar";
    const status =
      error instanceof EnvError
        ? 400
        : error instanceof JiraApiError
          ? error.status === 401 || error.status === 403
            ? 401
            : 502
          : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
