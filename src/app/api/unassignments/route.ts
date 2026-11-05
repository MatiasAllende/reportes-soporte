import { NextResponse } from "next/server";
import { EnvError } from "@/lib/env";
import { JiraApiError } from "@/lib/jira/client";
import { refreshWeekUnassignments } from "@/lib/jira/week-unassignments";
import { listUnassignments } from "@/lib/repositories/unassignments";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const weekId = new URL(request.url).searchParams.get("weekId")?.trim();
  if (!weekId) {
    return NextResponse.json({ error: "Falta weekId" }, { status: 400 });
  }

  let warning: string | undefined;
  try {
    await refreshWeekUnassignments(weekId);
  } catch (error) {
    warning = error instanceof Error ? error.message : "No se pudo consultar Jira";
    const status = error instanceof EnvError ? 400 : error instanceof JiraApiError ? 502 : 500;
    if (status === 400) {
      return NextResponse.json({ error: warning, items: [] }, { status });
    }
  }

  try {
    const items = await listUnassignments(weekId);
    return NextResponse.json({ items, warning });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron leer las desasignaciones";
    return NextResponse.json({ error: message, items: [] }, { status: 500 });
  }
}
