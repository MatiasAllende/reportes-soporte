import { getJiraEnv, type JiraEnv } from "@/lib/env";

export type JiraStatusCategory = {
  key?: string;
  name?: string;
};

export type JiraIssue = {
  id: string;
  key: string;
  fields: {
    summary?: string;
    created: string;
    updated: string;
    resolutiondate: string | null;
    resolution?: { name?: string } | null;
    assignee: { accountId: string; displayName: string } | null;
    status: {
      name: string;
      statusCategory?: JiraStatusCategory;
    };
  };
  changelog?: {
    histories: {
      created: string;
      author?: { displayName?: string; accountId?: string };
      items: {
        field: string;
        fromString: string | null;
        toString: string | null;
        from?: string | null;
        to?: string | null;
      }[];
    }[];
  };
};

type SearchResponse = {
  issues: JiraIssue[];
  nextPageToken?: string;
  isLast?: boolean;
};

export class JiraApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "JiraApiError";
    this.status = status;
  }
}

function authHeader(env: JiraEnv): string {
  return `Basic ${Buffer.from(`${env.email}:${env.apiToken}`).toString("base64")}`;
}

async function jiraFetch<T>(
  env: JiraEnv,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${env.baseUrl}${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: authHeader(env),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    if (
      response.status === 404 &&
      !(response.headers.get("content-type") ?? "").includes("json")
    ) {
      throw new JiraApiError(
        `No existe un sitio Jira en ${env.baseUrl}. Revisá JIRA_BASE_URL en .env.local (es la URL que ves en el navegador al abrir Jira).`,
        404,
      );
    }
    let detail = response.statusText;
    try {
      const body = (await response.json()) as {
        errorMessages?: string[];
        message?: string;
      };
      detail =
        body.errorMessages?.join("; ") ||
        body.message ||
        detail;
    } catch {
      // ignore parse errors
    }
    throw new JiraApiError(
      `Jira respondió ${response.status}: ${detail}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

async function jsmFetch<T>(path: string): Promise<T> {
  const env = getJiraEnv();
  const url = `${env.baseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: authHeader(env),
      "X-ExperimentalApi": "opt-in",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as {
        errorMessage?: string;
        message?: string;
      };
      detail = body.errorMessage || body.message || detail;
    } catch {
      // ignore
    }
    throw new JiraApiError(`Jira respondió ${response.status}: ${detail}`, response.status);
  }
  return (await response.json()) as T;
}

export type AssignableUser = {
  accountId: string;
  displayName: string;
  active: boolean;
};

export async function listAssignableUsers(): Promise<AssignableUser[]> {
  const env = getJiraEnv();
  const users: AssignableUser[] = [];
  let startAt = 0;
  for (;;) {
    const params = new URLSearchParams({
      project: env.projectKey,
      startAt: String(startAt),
      maxResults: "1000",
    });
    const page = await jiraFetch<AssignableUser[]>(
      env,
      `/rest/api/3/user/assignable/search?${params.toString()}`,
    );
    users.push(...page.filter((user) => user.active && user.accountId));
    if (page.length < 1000) break;
    startAt += page.length;
  }
  return users;
}

export type ServiceDesk = { id: string; projectKey: string; projectName: string };

export async function getProjectServiceDesk(): Promise<ServiceDesk> {
  const env = getJiraEnv();
  const seen: string[] = [];
  let start = 0;
  for (;;) {
    const page = await jsmFetch<{
      values: ServiceDesk[];
      isLastPage?: boolean;
    }>(`/rest/servicedeskapi/servicedesk?start=${start}&limit=50`);
    const match = page.values.find((desk) => desk.projectKey === env.projectKey);
    if (match) return match;
    seen.push(...page.values.map((desk) => desk.projectKey));
    if (page.isLastPage !== false || page.values.length === 0) break;
    start += page.values.length;
  }
  throw new JiraApiError(
    `No hay un service desk para el proyecto ${env.projectKey}. Tu usuario ve ${seen.length} mesas${seen.length ? ` (${seen.slice(0, 15).join(", ")}${seen.length > 15 ? "…" : ""})` : ""}.`,
    404,
  );
}

export type JsmQueue = { id: string; name: string; issueCount: number };

export async function listServiceDeskQueues(): Promise<{
  serviceDeskId: string;
  queues: JsmQueue[];
}> {
  const desk = await getProjectServiceDesk();
  const page = await jsmFetch<{
    values: { id: string; name: string; issueCount?: number }[];
  }>(`/rest/servicedeskapi/servicedesk/${desk.id}/queue?includeCount=true&limit=50`);
  return {
    serviceDeskId: desk.id,
    queues: page.values.map((queue) => ({
      id: String(queue.id),
      name: queue.name,
      issueCount: queue.issueCount ?? 0,
    })),
  };
}

export type QueueIssue = {
  key: string;
  summary: string;
  status: string;
  assignee: string | null;
  assigneeAccountId: string | null;
};

export async function listQueueIssues(queueId: string): Promise<QueueIssue[]> {
  const desk = await getProjectServiceDesk();
  const page = await jsmFetch<{
    values: {
      key: string;
      fields?: {
        summary?: string;
        status?: { name?: string };
        assignee?: { displayName?: string; accountId?: string } | null;
      };
    }[];
  }>(
    `/rest/servicedeskapi/servicedesk/${desk.id}/queue/${queueId}/issue?limit=50`,
  );
  return page.values.map((issue) => ({
    key: issue.key,
    summary: issue.fields?.summary ?? issue.key,
    status: issue.fields?.status?.name ?? "—",
    assignee: issue.fields?.assignee?.displayName ?? null,
    assigneeAccountId: issue.fields?.assignee?.accountId ?? null,
  }));
}

export type IssueHistoryItem = {
  at: string;
  field: string;
  from: string | null;
  to: string | null;
};

export type IssueDetail = {
  key: string;
  summary: string;
  status: string;
  resolution: string | null;
  assignee: string | null;
  created: string;
  updated: string;
  history: IssueHistoryItem[];
};

export async function getIssueDetail(issueKey: string): Promise<IssueDetail> {
  const env = getJiraEnv();
  const issue = await jiraFetch<JiraIssue>(
    env,
    `/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=summary,status,resolution,assignee,created,updated&expand=changelog`,
  );
  const history: IssueHistoryItem[] = [];
  for (const entry of issue.changelog?.histories ?? []) {
    for (const item of entry.items) {
      if (!["status", "assignee", "resolution"].includes(item.field)) continue;
      history.push({
        at: entry.created,
        field: item.field,
        from: item.fromString,
        to: item.toString,
      });
    }
  }
  history.sort((a, b) => b.at.localeCompare(a.at));
  return {
    key: issue.key,
    summary: issue.fields.summary ?? issue.key,
    status: issue.fields.status.name,
    resolution: issue.fields.resolution?.name ?? null,
    assignee: issue.fields.assignee?.displayName ?? null,
    created: issue.fields.created,
    updated: issue.fields.updated,
    history,
  };
}

export type SlaCycle = {
  name: string;
  breached: boolean;
  ongoing: boolean;
  elapsedMillis: number | null;
  remainingMillis: number | null;
  stopTime: string | null;
};

type SlaDuration = { millis?: number };
type SlaStamp = { iso8601?: string; jira?: string };

export async function getIssueSlas(issueKey: string): Promise<SlaCycle[]> {
  const payload = await jsmFetch<{
    values: {
      name: string;
      ongoingCycle?: {
        breached?: boolean;
        elapsedTime?: SlaDuration;
        remainingTime?: SlaDuration;
      } | null;
      completedCycles?: {
        breached?: boolean;
        elapsedTime?: SlaDuration;
        remainingTime?: SlaDuration;
        stopTime?: SlaStamp;
      }[];
    }[];
  }>(`/rest/servicedeskapi/request/${encodeURIComponent(issueKey)}/sla`);

  const cycles: SlaCycle[] = [];
  for (const sla of payload.values ?? []) {
    if (sla.ongoingCycle) {
      cycles.push({
        name: sla.name,
        breached: Boolean(sla.ongoingCycle.breached),
        ongoing: true,
        elapsedMillis: sla.ongoingCycle.elapsedTime?.millis ?? null,
        remainingMillis: sla.ongoingCycle.remainingTime?.millis ?? null,
        stopTime: null,
      });
    }
    for (const cycle of sla.completedCycles ?? []) {
      cycles.push({
        name: sla.name,
        breached: Boolean(cycle.breached),
        ongoing: false,
        elapsedMillis: cycle.elapsedTime?.millis ?? null,
        remainingMillis: cycle.remainingTime?.millis ?? null,
        stopTime: cycle.stopTime?.iso8601 ?? cycle.stopTime?.jira ?? null,
      });
    }
  }
  return cycles;
}

export async function searchAllIssues(
  jql: string,
  options?: { expand?: string[]; fields?: string[]; maxIssues?: number },
): Promise<JiraIssue[]> {
  const env = getJiraEnv();
  const fields = (
    options?.fields ?? [
      "summary",
      "created",
      "updated",
      "resolutiondate",
      "resolution",
      "assignee",
      "status",
    ]
  ).join(",");
  const expand = options?.expand?.join(",") ?? "";
  const pageSize = 100;
  let nextPageToken: string | undefined;
  const issues: JiraIssue[] = [];

  for (;;) {
    const params = new URLSearchParams({
      jql,
      maxResults: String(pageSize),
      fields,
    });
    if (expand) params.set("expand", expand);
    if (nextPageToken) params.set("nextPageToken", nextPageToken);

    const page = await jiraFetch<SearchResponse>(
      env,
      `/rest/api/3/search/jql?${params.toString()}`,
    );
    issues.push(...page.issues);
    if (options?.maxIssues && issues.length >= options.maxIssues) {
      return issues.slice(0, options.maxIssues);
    }
    nextPageToken = page.nextPageToken;
    if (page.isLast || !nextPageToken || page.issues.length === 0) break;
  }

  return issues;
}

export function isDoneCategory(issue: JiraIssue): boolean {
  const key = issue.fields.status.statusCategory?.key?.toLowerCase();
  const name = issue.fields.status.statusCategory?.name?.toLowerCase();
  return key === "done" || name === "done";
}

export function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
}

/** True if issue left Done during [start, end] inclusive (calendar days). */
export function wasReopenedInRange(
  issue: JiraIssue,
  startDate: string,
  endDate: string,
): boolean {
  const histories = issue.changelog?.histories ?? [];
  const startMs = new Date(`${startDate}T00:00:00`).getTime();
  const endMs = new Date(`${endDate}T23:59:59.999`).getTime();

  for (const history of histories) {
    const at = new Date(history.created).getTime();
    if (at < startMs || at > endMs) continue;
    for (const item of history.items) {
      if (item.field !== "status") continue;
      const from = (item.fromString ?? "").toLowerCase();
      const to = (item.toString ?? "").toLowerCase();
      // Heuristic: leaving a Done-named status into something else.
      const fromDone =
        from.includes("done") ||
        from.includes("cerrad") ||
        from.includes("resuelt") ||
        from.includes("closed") ||
        from.includes("resolved");
      const toDone =
        to.includes("done") ||
        to.includes("cerrad") ||
        to.includes("resuelt") ||
        to.includes("closed") ||
        to.includes("resolved");
      if (fromDone && !toDone) return true;
    }
  }
  return false;
}
