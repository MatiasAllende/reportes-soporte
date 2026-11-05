import { randomUUID } from "crypto";
import { getDb, queryAll, queryOne, saveDb } from "@/lib/db";
import type { Technician, TechnicianInput } from "@/lib/types";

type TechnicianRow = {
  id: string;
  name: string;
  account_id: string;
  team: string | null;
  active: number;
  created_at: string;
  updated_at: string;
};

function mapRow(row: TechnicianRow): Technician {
  return {
    id: row.id,
    name: row.name,
    accountId: row.account_id,
    team: row.team,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listTechnicians(options?: {
  activeOnly?: boolean;
}): Promise<Technician[]> {
  const db = await getDb();
  const rows = options?.activeOnly
    ? queryAll<TechnicianRow>(
        db,
        `SELECT * FROM technicians WHERE active = 1 ORDER BY name COLLATE NOCASE`,
      )
    : queryAll<TechnicianRow>(
        db,
        `SELECT * FROM technicians ORDER BY active DESC, name COLLATE NOCASE`,
      );
  return rows.map(mapRow);
}

export async function getTechnicianById(
  id: string,
): Promise<Technician | undefined> {
  const db = await getDb();
  const row = queryOne<TechnicianRow>(
    db,
    `SELECT * FROM technicians WHERE id = ?`,
    [id],
  );
  return row ? mapRow(row) : undefined;
}

export async function getTechnicianNameMap(): Promise<Map<string, string>> {
  const technicians = await listTechnicians();
  return new Map(technicians.map((t) => [t.id, t.name]));
}

export async function upsertTechnicians(
  inputs: TechnicianInput[],
): Promise<Technician[]> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result: Technician[] = [];

  const roster = inputs.filter((input) => input.active !== false);

  for (const input of roster) {
    const existing = queryOne<TechnicianRow>(
      db,
      `SELECT * FROM technicians WHERE account_id = ?`,
      [input.accountId],
    );

    if (existing) {
      db.run(
        `UPDATE technicians
         SET name = ?, team = ?, active = ?, updated_at = ?
         WHERE account_id = ?`,
        [
          input.name,
          input.team ?? null,
          input.active === false ? 0 : 1,
          now,
          input.accountId,
        ],
      );
      const updated = queryOne<TechnicianRow>(
        db,
        `SELECT * FROM technicians WHERE account_id = ?`,
        [input.accountId],
      )!;
      result.push(mapRow(updated));
    } else {
      const id = randomUUID();
      db.run(
        `INSERT INTO technicians (id, name, account_id, team, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.name,
          input.accountId,
          input.team ?? null,
          input.active === false ? 0 : 1,
          now,
          now,
        ],
      );
      result.push({
        id,
        name: input.name,
        accountId: input.accountId,
        team: input.team ?? null,
        active: input.active !== false,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const keep = new Set(roster.map((input) => input.accountId));
  const current = queryAll<TechnicianRow>(db, `SELECT * FROM technicians`);
  for (const row of current) {
    if (!keep.has(row.account_id)) {
      deleteTechnician(db, row.id);
    }
  }

  saveDb(db);
  return result;
}

function deleteTechnician(
  db: Awaited<ReturnType<typeof getDb>>,
  id: string,
) {
  db.run(`DELETE FROM technician_week_stats WHERE technician_id = ?`, [id]);
  db.run(`DELETE FROM resolved_issues WHERE technician_id = ?`, [id]);
  db.run(`DELETE FROM technicians WHERE id = ?`, [id]);
}
