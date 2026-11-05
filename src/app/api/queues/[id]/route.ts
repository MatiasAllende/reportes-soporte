import { NextResponse } from "next/server";
import { EnvError } from "@/lib/env";
import {
  getIssueSlas,
  JiraApiError,
  listQueueIssues,
} from "@/lib/jira/client";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const issues = await listQueueIssues(id);
    const withSla = await mapLimit(issues, 4, async (issue) => {
      try {
        const cycles = await getIssueSlas(issue.key);
        const breached = cycles.some((cycle) => cycle.breached);
        return { ...issue, breached };
      } catch {
        return { ...issue, breached: false };
      }
    });
    return NextResponse.json({ issues: withSla });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al leer la cola";
    const status = error instanceof EnvError ? 400 : error instanceof JiraApiError ? 502 : 500;
    return NextResponse.json({ error: message, issues: [] }, { status });
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}
