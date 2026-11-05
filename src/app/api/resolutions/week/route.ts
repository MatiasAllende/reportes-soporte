import { NextResponse } from "next/server";
import { EnvError } from "@/lib/env";
import { JiraApiError } from "@/lib/jira/client";
import { loadWeekResolutions } from "@/lib/jira/week-resolutions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const weekId = new URL(request.url).searchParams.get("weekId")?.trim();
  if (!weekId) {
    return NextResponse.json({ error: "Falta weekId" }, { status: 400 });
  }
  try {
    const ranked = await loadWeekResolutions(weekId);
    return NextResponse.json(ranked);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron leer las resoluciones";
    const status = error instanceof EnvError ? 400 : error instanceof JiraApiError ? 502 : 500;
    return NextResponse.json({ error: message, most: [], least: [] }, { status });
  }
}
