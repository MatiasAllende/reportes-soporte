import { getDb, queryAll, queryOne, saveDb } from "@/lib/db";
import type {
  ResolvedIssue,
  SyncRun,
  TechnicianWeekStats,
  WeekSnapshot,
} from "@/lib/types";

type SnapshotRow = {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  created_count: number;
  resolved_count: number;
  open_count: number;
  stale_count: number;
  unassigned_count: number;
  reopened_count: number;
  synced_at: string;
};

type StatsRow = {
  week_id: string;
  technician_id: string;
  open_count: number;
  resolved_count: number;
  created_count: number;
  avg_resolution_days: number;
};

type SyncRow = {
  id: number;
  week_id: string;
  status: string;
  message: string;
  started_at: string;
  finished_at: string;
};

function mapStats(row: StatsRow): TechnicianWeekStats {
  return {
    id: row.technician_id,
    open: row.open_count,
    resolved: row.resolved_count,
    created: row.created_count,
    avgResolutionDays: row.avg_resolution_days,
  };
}

function mapSnapshot(
  row: SnapshotRow,
  byTechnician: TechnicianWeekStats[],
): WeekSnapshot {
  return {
    id: row.id,
    label: row.label,
    start: row.start_date,
    end: row.end_date,
    created: row.created_count,
    resolved: row.resolved_count,
    open: row.open_count,
    stale: row.stale_count,
    unassigned: row.unassigned_count,
    reopened: row.reopened_count,
    byTechnician,
    syncedAt: row.synced_at,
  };
}

export async function listWeekSnapshots(): Promise<WeekSnapshot[]> {
  const db = await getDb();
  const rows = queryAll<SnapshotRow>(
    db,
    `SELECT * FROM weekly_snapshots ORDER BY start_date ASC`,
  );
  return rows.map((row) => {
    const stats = queryAll<StatsRow>(
      db,
      `SELECT * FROM technician_week_stats WHERE week_id = ?`,
      [row.id],
    ).map(mapStats);
    return mapSnapshot(row, stats);
  });
}

export async function getWeekSnapshot(
  weekId: string,
): Promise<WeekSnapshot | undefined> {
  const db = await getDb();
  const row = queryOne<SnapshotRow>(
    db,
    `SELECT * FROM weekly_snapshots WHERE id = ?`,
    [weekId],
  );
  if (!row) return undefined;
  const stats = queryAll<StatsRow>(
    db,
    `SELECT * FROM technician_week_stats WHERE week_id = ?`,
    [weekId],
  ).map(mapStats);
  return mapSnapshot(row, stats);
}

export async function saveWeekSnapshot(snapshot: WeekSnapshot): Promise<void> {
  const db = await getDb();
  const syncedAt = snapshot.syncedAt ?? new Date().toISOString();

  db.run(`DELETE FROM technician_week_stats WHERE week_id = ?`, [snapshot.id]);
  db.run(`DELETE FROM weekly_snapshots WHERE id = ?`, [snapshot.id]);

  db.run(
    `INSERT INTO weekly_snapshots (
      id, label, start_date, end_date,
      created_count, resolved_count, open_count,
      stale_count, unassigned_count, reopened_count, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      snapshot.id,
      snapshot.label,
      snapshot.start,
      snapshot.end,
      snapshot.created,
      snapshot.resolved,
      snapshot.open,
      snapshot.stale,
      snapshot.unassigned,
      snapshot.reopened,
      syncedAt,
    ],
  );

  for (const row of snapshot.byTechnician) {
    db.run(
      `INSERT INTO technician_week_stats (
        week_id, technician_id, open_count, resolved_count,
        created_count, avg_resolution_days
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        snapshot.id,
        row.id,
        row.open,
        row.resolved,
        row.created,
        row.avgResolutionDays,
      ],
    );
  }

  saveDb(db);
}

export async function replaceResolvedIssues(
  weekId: string,
  issues: Omit<ResolvedIssue, "url">[],
): Promise<void> {
  const db = await getDb();
  db.run(`DELETE FROM resolved_issues WHERE week_id = ?`, [weekId]);
  for (const issue of issues) {
    db.run(
      `INSERT INTO resolved_issues (
        week_id, technician_id, issue_key, summary,
        created_at, resolved_at, resolution_days, resolution
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        weekId,
        issue.technicianId,
        issue.issueKey,
        issue.summary,
        issue.createdAt,
        issue.resolvedAt,
        issue.resolutionDays,
        issue.resolution,
      ],
    );
  }
  saveDb(db);
}

export async function listResolvedIssues(
  technicianId: string,
): Promise<Omit<ResolvedIssue, "url">[]> {
  const db = await getDb();
  const rows = queryAll<{
    week_id: string;
    technician_id: string;
    issue_key: string;
    summary: string;
    created_at: string;
    resolved_at: string;
    resolution_days: number;
    resolution: string | null;
  }>(
    db,
    `SELECT * FROM resolved_issues
     WHERE technician_id = ?
     ORDER BY resolved_at DESC`,
    [technicianId],
  );
  return rows.map((row) => ({
    weekId: row.week_id,
    technicianId: row.technician_id,
    issueKey: row.issue_key,
    summary: row.summary,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    resolutionDays: row.resolution_days,
    resolution: row.resolution,
  }));
}

export async function recordSyncRun(input: {
  weekId: string;
  status: "success" | "error";
  message: string;
  startedAt: string;
  finishedAt: string;
}): Promise<SyncRun> {
  const db = await getDb();
  db.run(
    `INSERT INTO sync_runs (week_id, status, message, started_at, finished_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.weekId,
      input.status,
      input.message,
      input.startedAt,
      input.finishedAt,
    ],
  );
  saveDb(db);
  const row = queryOne<SyncRow>(
    db,
    `SELECT * FROM sync_runs ORDER BY id DESC LIMIT 1`,
  )!;
  return {
    id: row.id,
    weekId: row.week_id,
    status: row.status as "success" | "error",
    message: row.message,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

export async function getLatestSyncRun(): Promise<SyncRun | undefined> {
  const db = await getDb();
  const row = queryOne<SyncRow>(
    db,
    `SELECT * FROM sync_runs ORDER BY id DESC LIMIT 1`,
  );
  if (!row) return undefined;
  return {
    id: row.id,
    weekId: row.week_id,
    status: row.status as "success" | "error",
    message: row.message,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}
