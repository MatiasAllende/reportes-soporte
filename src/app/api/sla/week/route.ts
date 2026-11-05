import { NextResponse } from "next/server";
import { EnvError, getJiraEnv } from "@/lib/env";
import {
  getIssueSlas,
  JiraApiError,
  searchAllIssues,
  type SlaCycle,
} from "@/lib/jira/client";
import { listTechnicians } from "@/lib/repositories/technicians";
import { rangeFromWeekId } from "@/lib/weeks";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const weekId = new URL(request.url).searchParams.get("weekId");
    if (!weekId) {
      return NextResponse.json({ error: "Falta weekId" }, { status: 400 });
    }
    const { start, end } = rangeFromWeekId(weekId);
    const env = getJiraEnv();
    const technicians = await listTechnicians({ activeOnly: true });
    const known = new Map(technicians.map((tech) => [tech.accountId, tech]));
    const issues = await searchAllIssues(
      `project = ${env.projectKey} AND assignee is not EMPTY AND updated >= "${start}" AND updated <= "${end} 23:59"`,
      { fields: ["summary", "assignee", "updated"] },
    );
    const sample = issues.slice(0, 40);
    const tallies = new Map<
      string,
      { id: string; name: string; met: number; breached: number }
    >();

    for (const issue of sample) {
      const accountId = issue.fields.assignee?.accountId;
      const tech = accountId ? known.get(accountId) : undefined;
      if (!tech) continue;
      let cycles: SlaCycle[] = [];
      try {
        cycles = await getIssueSlas(issue.key);
      } catch {
        continue;
      }
      const row = tallies.get(tech.id) ?? {
        id: tech.id,
        name: tech.name,
        met: 0,
        breached: 0,
      };
      for (const cycle of cycles) {
        if (cycle.breached) row.breached += 1;
        else row.met += 1;
      }
      tallies.set(tech.id, row);
    }

    const rows = [...tallies.values()];
    return NextResponse.json({
      capped: issues.length > sample.length,
      met: rows.filter((row) => row.met > 0).sort((a, b) => b.met - a.met),
      breached: rows
        .filter((row) => row.breached > 0)
        .sort((a, b) => b.breached - a.breached),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al leer SLA";
    const status = error instanceof EnvError ? 400 : error instanceof JiraApiError ? 502 : 500;
    return NextResponse.json({ error: message, met: [], breached: [] }, { status });
  }
}
