import { getJiraEnv } from "@/lib/env";
import {
  daysBetween,
  isDoneCategory,
  searchAllIssues,
  wasReopenedInRange,
  type JiraIssue,
} from "@/lib/jira/client";
import { listTechnicians } from "@/lib/repositories/technicians";
import {
  getWeekSnapshot,
  recordSyncRun,
  replaceResolvedIssues,
  saveWeekSnapshot,
} from "@/lib/repositories/weeks";
import type { ResolvedIssue, TechnicianWeekStats, WeekSnapshot } from "@/lib/types";
import { rangeFromWeekId } from "@/lib/weeks";

const STALE_DAYS = 3;

function inCalendarRange(isoTimestamp: string, start: string, end: string): boolean {
  const day = isoTimestamp.slice(0, 10);
  return day >= start && day <= end;
}

function buildSnapshotFromIssues(
  weekId: string,
  label: string,
  start: string,
  end: string,
  issues: {
    created: JiraIssue[];
    resolved: JiraIssue[];
    open: JiraIssue[];
    changelogPool: JiraIssue[];
  },
  technicians: { id: string; accountId: string }[],
): WeekSnapshot {
  const accountToTech = new Map(
    technicians.map((t) => [t.accountId, t.id] as const),
  );

  const created = issues.created.filter((i) =>
    inCalendarRange(i.fields.created, start, end),
  );
  const resolved = issues.resolved.filter(
    (i) =>
      Boolean(i.fields.resolution?.name) &&
      i.fields.resolutiondate &&
      inCalendarRange(i.fields.resolutiondate, start, end),
  );
  const open = issues.open;
  const staleCutoff = new Date(`${end}T23:59:59.999`);
  staleCutoff.setDate(staleCutoff.getDate() - STALE_DAYS);
  const staleIso = staleCutoff.toISOString();

  const stale = open.filter((i) => i.fields.updated < staleIso);
  const unassigned = open.filter((i) => !i.fields.assignee);
  const reopened = issues.changelogPool.filter((i) =>
    wasReopenedInRange(i, start, end),
  );

  const byTechnician: TechnicianWeekStats[] = technicians.map((tech) => {
    const techCreated = created.filter(
      (i) => i.fields.assignee?.accountId === tech.accountId,
    );
    const techResolved = resolved.filter(
      (i) => i.fields.assignee?.accountId === tech.accountId,
    );
    const techOpen = open.filter(
      (i) => i.fields.assignee?.accountId === tech.accountId,
    );

    let avgResolutionDays = 0;
    if (techResolved.length > 0) {
      const total = techResolved.reduce((sum, issue) => {
        const resolvedAt = issue.fields.resolutiondate!;
        return sum + daysBetween(issue.fields.created, resolvedAt);
      }, 0);
      avgResolutionDays = Math.round((total / techResolved.length) * 10) / 10;
    }

    return {
      id: tech.id,
      open: techOpen.length,
      resolved: techResolved.length,
      created: techCreated.length,
      avgResolutionDays,
    };
  });

  // Include open tickets whose assignee is not in the technician list under no one;
  // metrics above already only count mapped technicians.

  void accountToTech;

  return {
    id: weekId,
    label,
    start,
    end,
    created: created.length,
    resolved: resolved.length,
    open: open.length,
    stale: stale.length,
    unassigned: unassigned.length,
    reopened: reopened.length,
    byTechnician,
    syncedAt: new Date().toISOString(),
  };
}

export async function syncWeekFromJira(weekId: string): Promise<WeekSnapshot> {
  const startedAt = new Date().toISOString();
  const env = getJiraEnv();
  const { start, end, label } = rangeFromWeekId(weekId);
  const technicians = await listTechnicians({ activeOnly: true });

  if (technicians.length === 0) {
    const finishedAt = new Date().toISOString();
    await recordSyncRun({
      weekId,
      status: "error",
      message: "No hay técnicos activos. Importá el CSV antes de sincronizar.",
      startedAt,
      finishedAt,
    });
    throw new Error(
      "No hay técnicos activos. Importá el CSV antes de sincronizar.",
    );
  }

  try {
    const project = env.projectKey;
    const createdJql = `project = ${project} AND created >= "${start}" AND created <= "${end} 23:59"`;
    const resolvedJql = `project = ${project} AND resolution is not EMPTY AND resolved >= "${start}" AND resolved <= "${end} 23:59"`;
    const openJql = `project = ${project} AND created <= "${end} 23:59" AND (resolved is EMPTY OR resolved > "${end} 23:59")`;
    const reopenJql = `project = ${project} AND updated >= "${start}" AND updated <= "${end} 23:59"`;

    const [created, resolved, open, changelogPool] = await Promise.all([
      searchAllIssues(createdJql),
      searchAllIssues(resolvedJql),
      searchAllIssues(openJql),
      searchAllIssues(reopenJql, { expand: ["changelog"] }),
    ]);

    // Filter open set to non-Done as of query time for current week accuracy;
    // historical JQL already approximates with resolved empty/after end.
    const openFiltered = open.filter((issue) => !isDoneCategory(issue) || !issue.fields.resolutiondate || issue.fields.resolutiondate.slice(0, 10) > end);

    const snapshot = buildSnapshotFromIssues(
      weekId,
      label,
      start,
      end,
      {
        created,
        resolved,
        open: openFiltered,
        changelogPool,
      },
      technicians.map((t) => ({ id: t.id, accountId: t.accountId })),
    );

    await saveWeekSnapshot(snapshot);
    await replaceResolvedIssues(
      weekId,
      collectResolvedIssues(
        weekId,
        start,
        end,
        resolved,
        technicians.map((t) => ({ id: t.id, accountId: t.accountId })),
      ),
    );
    const finishedAt = new Date().toISOString();
    await recordSyncRun({
      weekId,
      status: "success",
      message: `Sincronizado: ${snapshot.created} creados, ${snapshot.resolved} resueltos, ${snapshot.open} abiertos.`,
      startedAt,
      finishedAt,
    });

    return (await getWeekSnapshot(weekId))!;
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const message =
      error instanceof Error ? error.message : "Error desconocido al sincronizar";
    await recordSyncRun({
      weekId,
      status: "error",
      message,
      startedAt,
      finishedAt,
    });
    throw error;
  }
}

export function collectResolvedIssues(
  weekId: string,
  start: string,
  end: string,
  resolved: JiraIssue[],
  technicians: { id: string; accountId: string }[],
): Omit<ResolvedIssue, "url">[] {
  const accountToTech = new Map(
    technicians.map((tech) => [tech.accountId, tech.id] as const),
  );

  return resolved.flatMap((issue) => {
    const resolvedAt = issue.fields.resolutiondate;
    const resolution = issue.fields.resolution?.name?.trim() || null;
    const accountId = issue.fields.assignee?.accountId;
    const technicianId = accountId ? accountToTech.get(accountId) : undefined;
    if (!resolvedAt || !resolution || !technicianId || !inCalendarRange(resolvedAt, start, end)) {
      return [];
    }
    const resolutionDays =
      Math.round(daysBetween(issue.fields.created, resolvedAt) * 10) / 10;
    return [
      {
        weekId,
        technicianId,
        issueKey: issue.key,
        summary: issue.fields.summary?.trim() || issue.key,
        createdAt: issue.fields.created,
        resolvedAt,
        resolutionDays,
        resolution,
      },
    ];
  });
}

/** Pure helper exported for unit tests. */
export function computeWeekMetricsForTest(
  weekId: string,
  label: string,
  start: string,
  end: string,
  issues: {
    created: JiraIssue[];
    resolved: JiraIssue[];
    open: JiraIssue[];
    changelogPool: JiraIssue[];
  },
  technicians: { id: string; accountId: string }[],
): WeekSnapshot {
  return buildSnapshotFromIssues(weekId, label, start, end, issues, technicians);
}
