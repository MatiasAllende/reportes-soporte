import { NextResponse } from "next/server";
import { getJiraEnv, hasJiraEnv } from "@/lib/env";
import { listResolvedIssues } from "@/lib/repositories/weeks";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const issues = await listResolvedIssues(id);
  const baseUrl = hasJiraEnv() ? getJiraEnv().baseUrl : null;

  return NextResponse.json({
    issues: issues.map((issue) => ({
      ...issue,
      url: baseUrl ? `${baseUrl}/browse/${issue.issueKey}` : null,
    })),
  });
}
