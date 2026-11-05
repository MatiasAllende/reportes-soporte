import { NextResponse } from "next/server";
import { EnvError, getJiraEnv } from "@/lib/env";
import { getIssueDetail, getIssueSlas, JiraApiError } from "@/lib/jira/client";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string }> },
) {
  try {
    const { key } = await context.params;
    const [issue, slas] = await Promise.all([
      getIssueDetail(key),
      getIssueSlas(key).catch(() => []),
    ]);
    const base = getJiraEnv().baseUrl;
    return NextResponse.json({
      issue,
      slas,
      url: `${base}/browse/${issue.key}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al leer el ticket";
    const status = error instanceof EnvError ? 400 : error instanceof JiraApiError ? 502 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
