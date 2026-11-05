import { NextResponse } from "next/server";
import { EnvError } from "@/lib/env";
import { JiraApiError, listServiceDeskQueues } from "@/lib/jira/client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await listServiceDeskQueues();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al leer colas";
    const status = error instanceof EnvError ? 400 : error instanceof JiraApiError ? 502 : 500;
    return NextResponse.json({ error: message, queues: [] }, { status });
  }
}
