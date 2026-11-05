import { NextResponse } from "next/server";
import { EnvError, getJiraEnv } from "@/lib/env";
import { getIssueSlas, JiraApiError, searchAllIssues } from "@/lib/jira/client";
import {
  applyIssueChange,
  unassignChangesFromIssues,
  unassignNotices,
  type LiveIssue,
} from "@/lib/live-changes";
import { saveUnassignments } from "@/lib/repositories/unassignments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      previous?: LiveIssue[];
    };
    const env = getJiraEnv();
    const found = await searchAllIssues(
      `project = ${env.projectKey} AND updated >= -5m ORDER BY updated DESC`,
      {
        fields: ["summary", "status", "assignee", "updated", "created"],
        expand: ["changelog"],
      },
    );
    const issues: LiveIssue[] = found.slice(0, 30).map((issue) => ({
      key: issue.key,
      summary: issue.fields.summary ?? issue.key,
      status: issue.fields.status.name,
      assignee: issue.fields.assignee?.displayName ?? null,
      updated: issue.fields.updated,
      created: issue.fields.created,
    }));
    const since = Date.now() - 5 * 60 * 1000;
    const changes = unassignChangesFromIssues(
      found.slice(0, 30).map((issue) => ({
        key: issue.key,
        summary: issue.fields.summary ?? issue.key,
        changelog: issue.changelog,
      })),
      { startMs: since, endMs: Date.now() },
    );
    const fromHistory = unassignNotices(changes);
    let savedUnassignments: Awaited<ReturnType<typeof saveUnassignments>> = [];
    try {
      savedUnassignments = await saveUnassignments(changes);
    } catch {
      // El aviso en vivo sigue aunque falle el guardado.
    }
    const notices = [
      ...fromHistory,
      ...applyIssueChange(body.previous ?? [], issues).filter(
        (notice) =>
          notice.kind !== "desasignado" ||
          !fromHistory.some((item) => item.key === notice.key),
      ),
    ];
    const changed = notices.slice(0, 8);
    for (const notice of changed) {
      try {
        const cycles = await getIssueSlas(notice.key);
        if (cycles.some((cycle) => cycle.breached && cycle.ongoing)) {
          notices.push({
            id: `${notice.key}:sla:${notice.at}`,
            key: notice.key,
            kind: "sla",
            message: `${notice.key} tiene un SLA vencido`,
            at: notice.at,
          });
        }
      } catch {
        // SLA opcional en el poll
      }
    }
    notices.sort((a, b) => b.at.localeCompare(a.at));
    return NextResponse.json({ issues, notices, savedUnassignments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error en vivo";
    const status = error instanceof EnvError ? 400 : error instanceof JiraApiError ? 502 : 500;
    return NextResponse.json({ error: message, issues: [], notices: [] }, { status });
  }
}
