import { daysBetween, searchAllIssues } from "@/lib/jira/client";
import { getJiraEnv } from "@/lib/env";
import {
  listMostResolvers,
  rankResolutions,
  type ResolutionRankRow,
  type ResolutionTicket,
} from "@/lib/resolution-rank";
import { listTechnicians } from "@/lib/repositories/technicians";
import {
  getWeekSnapshot,
  replaceResolvedIssues,
  saveWeekSnapshot,
} from "@/lib/repositories/weeks";
import { rangeFromMonthId, rangeFromWeekId } from "@/lib/weeks";

type ResolvedHit = ResolutionTicket & { created: string };

async function findResolvedIssues(
  start: string,
  end: string,
): Promise<{
  technicians: { id: string; name: string; accountId: string }[];
  issues: ResolvedHit[];
  daysByKey: Map<string, number>;
}> {
  const env = getJiraEnv();
  const technicians = await listTechnicians({ activeOnly: true });
  const found = await searchAllIssues(
    `project = ${env.projectKey} AND resolution is not EMPTY AND resolved >= "${start}" AND resolved <= "${end} 23:59"`,
    {
      fields: ["summary", "assignee", "resolution", "resolutiondate", "created"],
    },
  );
  const issues = found.flatMap((issue) => {
    const resolution = issue.fields.resolution?.name?.trim();
    const resolvedAt = issue.fields.resolutiondate;
    if (!resolution || !resolvedAt || resolvedAt.slice(0, 10) < start || resolvedAt.slice(0, 10) > end) {
      return [];
    }
    return [
      {
        key: issue.key,
        summary: issue.fields.summary?.trim() || issue.key,
        resolution,
        resolvedAt,
        accountId: issue.fields.assignee?.accountId ?? null,
        created: issue.fields.created,
      },
    ];
  });
  const daysByKey = new Map(
    issues.map((issue) => [
      issue.key,
      Math.round(daysBetween(issue.created, issue.resolvedAt) * 10) / 10,
    ]),
  );
  return {
    technicians: technicians.map((tech) => ({
      id: tech.id,
      name: tech.name,
      accountId: tech.accountId,
    })),
    issues,
    daysByKey,
  };
}

export async function loadWeekResolutions(weekId: string): Promise<{
  most: ResolutionRankRow[];
  least: ResolutionRankRow[];
  othersWithLeast: number;
  withoutResolution: number;
}> {
  const { start, end } = rangeFromWeekId(weekId);
  const { technicians, issues, daysByKey } = await findResolvedIssues(start, end);
  const ranked = rankResolutions(technicians, issues, daysByKey);
  const accountToTech = new Map(
    technicians.map((tech) => [tech.accountId, tech.id] as const),
  );

  await replaceResolvedIssues(
    weekId,
    issues.flatMap((issue) => {
      const technicianId = issue.accountId
        ? accountToTech.get(issue.accountId)
        : undefined;
      if (!technicianId) return [];
      return [
        {
          weekId,
          technicianId,
          issueKey: issue.key,
          summary: issue.summary,
          createdAt: issue.created,
          resolvedAt: issue.resolvedAt,
          resolutionDays: daysByKey.get(issue.key) ?? 0,
          resolution: issue.resolution,
        },
      ];
    }),
  );

  const snapshot = await getWeekSnapshot(weekId);
  if (snapshot) {
    const byId = new Map(
      technicians.map((tech) => {
        const tickets = issues.filter((issue) => issue.accountId === tech.accountId);
        const days = tickets.reduce(
          (sum, issue) => sum + (daysByKey.get(issue.key) ?? 0),
          0,
        );
        return [
          tech.id,
          {
            resolved: tickets.length,
            avgResolutionDays:
              tickets.length > 0 ? Math.round((days / tickets.length) * 10) / 10 : 0,
          },
        ] as const;
      }),
    );
    await saveWeekSnapshot({
      ...snapshot,
      resolved: issues.length,
      byTechnician: snapshot.byTechnician.map((row) => {
        const next = byId.get(row.id);
        return next
          ? { ...row, resolved: next.resolved, avgResolutionDays: next.avgResolutionDays }
          : row;
      }),
    });
  }

  return ranked;
}

export async function loadMonthResolutions(monthId: string): Promise<{
  label: string;
  rows: ResolutionRankRow[];
}> {
  const { start, end, label } = rangeFromMonthId(monthId);
  const { technicians, issues, daysByKey } = await findResolvedIssues(start, end);
  return {
    label,
    rows: listMostResolvers(technicians, issues, daysByKey),
  };
}
