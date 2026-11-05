export type LiveIssue = {
  key: string;
  summary: string;
  status: string;
  assignee: string | null;
  updated: string;
  created: string;
};

export type LiveNotice = {
  id: string;
  key: string;
  kind: "creado" | "estado" | "reasignado" | "desasignado" | "actualizado" | "sla";
  message: string;
  at: string;
};

export type AssigneeChange = {
  key: string;
  summary: string;
  at: string;
  from: string;
  author: string | null;
};

type ChangelogIssue = {
  key: string;
  summary: string;
  changelog?: {
    histories: {
      created: string;
      author?: { displayName?: string };
      items: {
        field: string;
        fromString: string | null;
        toString: string | null;
      }[];
    }[];
  };
};

/** Assignee cleared inside an optional time window. */
export function unassignChangesFromIssues(
  issues: ChangelogIssue[],
  range?: { startMs: number; endMs: number },
): AssigneeChange[] {
  return issues.flatMap((issue) =>
    (issue.changelog?.histories ?? []).flatMap((history) => {
      const atMs = new Date(history.created).getTime();
      if (range && (atMs < range.startMs || atMs > range.endMs)) return [];
      return history.items
        .filter(
          (item) =>
            item.field === "assignee" && Boolean(item.fromString) && !item.toString,
        )
        .map((item) => ({
          key: issue.key,
          summary: issue.summary,
          at: history.created,
          from: item.fromString ?? "",
          author: history.author?.displayName ?? null,
        }));
    }),
  );
}

/** Someone cleared the assignee. `author` is who made the change. */
export function unassignNotices(changes: AssigneeChange[]): LiveNotice[] {
  return changes.map((change) => {
    const self =
      !change.author ||
      change.author.localeCompare(change.from, "es", { sensitivity: "base" }) === 0;
    const message = self
      ? `${change.from} se desasignó ${change.key}: ${change.summary}`
      : `${change.author} desasignó a ${change.from} de ${change.key}: ${change.summary}`;
    return {
      id: `${change.key}:desasignado:${change.at}`,
      key: change.key,
      kind: "desasignado",
      message,
      at: change.at,
    };
  });
}

/** Diff used by the poller. A future Jira webhook can call this with one issue. */
export function applyIssueChange(
  previous: LiveIssue[],
  current: LiveIssue[],
): LiveNotice[] {
  const before = new Map(previous.map((issue) => [issue.key, issue]));
  const notices: LiveNotice[] = [];

  for (const issue of current) {
    const prior = before.get(issue.key);
    if (!prior) {
      const createdRecently =
        Date.now() - new Date(issue.created).getTime() < 10 * 60 * 1000;
      notices.push({
        id: `${issue.key}:creado:${issue.updated}`,
        key: issue.key,
        kind: createdRecently ? "creado" : "actualizado",
        message: createdRecently
          ? `${issue.key} se creó: ${issue.summary}`
          : `${issue.key} apareció actualizado: ${issue.summary}`,
        at: issue.updated,
      });
      continue;
    }
    if (prior.updated === issue.updated) continue;
    if (prior.assignee && !issue.assignee) {
      notices.push({
        id: `${issue.key}:desasignado:${issue.updated}`,
        key: issue.key,
        kind: "desasignado",
        message: `${prior.assignee} se desasignó ${issue.key}: ${issue.summary}`,
        at: issue.updated,
      });
    }
    if (prior.status !== issue.status) {
      notices.push({
        id: `${issue.key}:estado:${issue.updated}`,
        key: issue.key,
        kind: "estado",
        message: `${issue.key} pasó de ${prior.status} a ${issue.status}`,
        at: issue.updated,
      });
    } else if (prior.assignee !== issue.assignee && issue.assignee) {
      notices.push({
        id: `${issue.key}:asignado:${issue.updated}`,
        key: issue.key,
        kind: "reasignado",
        message: `${issue.key} ahora está con ${issue.assignee ?? "nadie"}`,
        at: issue.updated,
      });
    } else if (!(prior.assignee && !issue.assignee)) {
      notices.push({
        id: `${issue.key}:upd:${issue.updated}`,
        key: issue.key,
        kind: "actualizado",
        message: `${issue.key} se actualizó: ${issue.summary}`,
        at: issue.updated,
      });
    }
  }

  return notices.sort((a, b) => b.at.localeCompare(a.at));
}
