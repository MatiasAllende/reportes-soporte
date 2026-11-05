import { getJiraEnv } from "@/lib/env";
import { searchAllIssues } from "@/lib/jira/client";
import { unassignChangesFromIssues } from "@/lib/live-changes";
import { saveUnassignments } from "@/lib/repositories/unassignments";
import { rangeFromWeekId } from "@/lib/weeks";

/** Pull this week's cleared assignments from Jira and keep them locally. */
export async function refreshWeekUnassignments(weekId: string): Promise<void> {
  const env = getJiraEnv();
  const { start, end } = rangeFromWeekId(weekId);
  const found = await searchAllIssues(
    `project = ${env.projectKey} AND assignee changed TO EMPTY DURING ("${start}", "${end}") ORDER BY updated DESC`,
    {
      fields: ["summary"],
      expand: ["changelog"],
      maxIssues: 200,
    },
  );
  const startMs = new Date(`${start}T00:00:00`).getTime();
  const endMs = new Date(`${end}T23:59:59.999`).getTime();
  const changes = unassignChangesFromIssues(
    found.map((issue) => ({
      key: issue.key,
      summary: issue.fields.summary ?? issue.key,
      changelog: issue.changelog,
    })),
    { startMs, endMs },
  );
  await saveUnassignments(changes);
}
