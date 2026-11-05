import { getDb, queryAll, saveDb } from "@/lib/db";
import type { AssigneeChange } from "@/lib/live-changes";
import { unassignNotices } from "@/lib/live-changes";
import { weekIdFromDate } from "@/lib/weeks";

export type StoredUnassignment = {
  id: string;
  weekId: string;
  key: string;
  summary: string;
  fromName: string;
  authorName: string | null;
  at: string;
  message: string;
};

export function toStoredUnassignments(
  changes: AssigneeChange[],
): StoredUnassignment[] {
  const notices = unassignNotices(changes);
  return changes.map((change, index) => ({
    id: notices[index].id,
    weekId: weekIdFromDate(new Date(change.at)),
    key: change.key,
    summary: change.summary,
    fromName: change.from,
    authorName: change.author,
    at: change.at,
    message: notices[index].message,
  }));
}

export async function saveUnassignments(
  changes: AssigneeChange[],
): Promise<StoredUnassignment[]> {
  const rows = toStoredUnassignments(changes);
  if (rows.length === 0) return [];
  const db = await getDb();
  for (const row of rows) {
    db.run(
      `INSERT OR IGNORE INTO unassignments (
        id, week_id, issue_key, summary, from_name, author_name, happened_at, message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        row.id,
        row.weekId,
        row.key,
        row.summary,
        row.fromName,
        row.authorName,
        row.at,
        row.message,
      ],
    );
  }
  saveDb(db);
  return rows;
}

export async function listUnassignments(
  weekId: string,
): Promise<StoredUnassignment[]> {
  const db = await getDb();
  const rows = queryAll<{
    id: string;
    week_id: string;
    issue_key: string;
    summary: string;
    from_name: string;
    author_name: string | null;
    happened_at: string;
    message: string;
  }>(
    db,
    `SELECT id, week_id, issue_key, summary, from_name, author_name, happened_at, message
     FROM unassignments
     WHERE week_id = ?
     ORDER BY happened_at DESC`,
    [weekId],
  );
  return rows.map((row) => ({
    id: row.id,
    weekId: row.week_id,
    key: row.issue_key,
    summary: row.summary,
    fromName: row.from_name,
    authorName: row.author_name,
    at: row.happened_at,
    message: row.message,
  }));
}
