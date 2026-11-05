import fs from "fs";
import path from "path";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";

function dataDir() {
  return path.join(process.cwd(), "data");
}

function dbPath() {
  return path.join(dataDir(), "pdse.sqlite");
}

function wasmPath() {
  return path.join(
    process.cwd(),
    "node_modules",
    "sql.js",
    "dist",
    "sql-wasm.wasm",
  );
}

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let initPromise: Promise<Database> | null = null;

function migrate(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS technicians (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      account_id TEXT NOT NULL UNIQUE,
      team TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS weekly_snapshots (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      created_count INTEGER NOT NULL,
      resolved_count INTEGER NOT NULL,
      open_count INTEGER NOT NULL,
      stale_count INTEGER NOT NULL,
      unassigned_count INTEGER NOT NULL,
      reopened_count INTEGER NOT NULL,
      synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS technician_week_stats (
      week_id TEXT NOT NULL,
      technician_id TEXT NOT NULL,
      open_count INTEGER NOT NULL,
      resolved_count INTEGER NOT NULL,
      created_count INTEGER NOT NULL,
      avg_resolution_days REAL NOT NULL,
      PRIMARY KEY (week_id, technician_id),
      FOREIGN KEY (week_id) REFERENCES weekly_snapshots(id) ON DELETE CASCADE,
      FOREIGN KEY (technician_id) REFERENCES technicians(id)
    );

    CREATE TABLE IF NOT EXISTS sync_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_id TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS resolved_issues (
      week_id TEXT NOT NULL,
      technician_id TEXT NOT NULL,
      issue_key TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved_at TEXT NOT NULL,
      resolution_days REAL NOT NULL,
      resolution TEXT,
      PRIMARY KEY (week_id, issue_key)
    );

    CREATE TABLE IF NOT EXISTS unassignments (
      id TEXT PRIMARY KEY,
      week_id TEXT NOT NULL,
      issue_key TEXT NOT NULL,
      summary TEXT NOT NULL,
      from_name TEXT NOT NULL,
      author_name TEXT,
      happened_at TEXT NOT NULL,
      message TEXT NOT NULL
    );
  `);

  const resolvedColumns = queryAll<{ name: string }>(
    database,
    `PRAGMA table_info(resolved_issues)`,
  );
  if (!resolvedColumns.some((column) => column.name === "resolution")) {
    database.run(`ALTER TABLE resolved_issues ADD COLUMN resolution TEXT`);
  }

  const inactive = queryAll<{ id: string }>(
    database,
    `SELECT id FROM technicians WHERE active = 0`,
  );
  for (const row of inactive) {
    database.run(`DELETE FROM technician_week_stats WHERE technician_id = ?`, [
      row.id,
    ]);
    database.run(`DELETE FROM resolved_issues WHERE technician_id = ?`, [
      row.id,
    ]);
    database.run(`DELETE FROM technicians WHERE id = ?`, [row.id]);
  }
}

function persist(database: Database) {
  const dir = dataDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const data = database.export();
  fs.writeFileSync(dbPath(), Buffer.from(data));
}

export async function getDb(): Promise<Database> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!SQL) {
      SQL = await initSqlJs({
        locateFile: () => wasmPath(),
      });
    }

    const file = dbPath();
    if (fs.existsSync(file)) {
      db = new SQL.Database(fs.readFileSync(file));
    } else {
      db = new SQL.Database();
    }

    migrate(db);
    persist(db);
    return db;
  })();

  return initPromise;
}

/** Test helper: drop in-memory handle so the next getDb() reloads from disk. */
export function resetDbConnection() {
  if (db) {
    db.close();
  }
  db = null;
  initPromise = null;
}

export function saveDb(database: Database = db!) {
  if (!database) {
    throw new Error("Base de datos no inicializada");
  }
  persist(database);
}

export function queryAll<T extends Record<string, unknown>>(
  database: Database,
  sql: string,
  params: unknown[] = [],
): T[] {
  const stmt = database.prepare(sql);
  stmt.bind(params as never[]);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T extends Record<string, unknown>>(
  database: Database,
  sql: string,
  params: unknown[] = [],
): T | undefined {
  return queryAll<T>(database, sql, params)[0];
}
