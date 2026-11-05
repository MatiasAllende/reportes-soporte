import { NextResponse } from "next/server";
import { JiraApiError } from "@/lib/jira/client";
import { listAssignableUsers } from "@/lib/jira/client";
import { EnvError } from "@/lib/env";
import {
  listTechnicians,
  upsertTechnicians,
} from "@/lib/repositories/technicians";

export const runtime = "nodejs";

export async function POST() {
  try {
    const users = await listAssignableUsers();
    if (users.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Jira no devolvió usuarios asignables para el proyecto." },
        { status: 400 },
      );
    }
    const technicians = await upsertTechnicians(
      users.map((user) => ({
        name: user.displayName,
        accountId: user.accountId,
        active: true,
      })),
    );
    const current = await listTechnicians({ activeOnly: true });
    return NextResponse.json({
      ok: true,
      accepted: technicians.length,
      technicians: current,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar";
    const status = error instanceof EnvError ? 400 : error instanceof JiraApiError ? 502 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
