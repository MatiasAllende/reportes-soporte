import { NextResponse } from "next/server";
import { EnvError } from "@/lib/env";
import { JiraApiError } from "@/lib/jira/client";
import { loadMonthResolutions } from "@/lib/jira/week-resolutions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const monthId = new URL(request.url).searchParams.get("monthId")?.trim();
  if (!monthId || !/^\d{4}-\d{2}$/.test(monthId)) {
    return NextResponse.json({ error: "Falta un mes válido" }, { status: 400 });
  }
  try {
    const ranked = await loadMonthResolutions(monthId);
    return NextResponse.json(ranked);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudieron leer las resoluciones";
    const status =
      error instanceof EnvError || message.startsWith("Mes inválido")
        ? 400
        : error instanceof JiraApiError
          ? 502
          : 500;
    return NextResponse.json({ error: message, rows: [] }, { status });
  }
}
