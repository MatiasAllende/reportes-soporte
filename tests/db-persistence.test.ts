import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { resetDbConnection, getDb } from "../src/lib/db";
import { upsertTechnicians, listTechnicians } from "../src/lib/repositories/technicians";
import { saveWeekSnapshot, getWeekSnapshot } from "../src/lib/repositories/weeks";
import {
  listUnassignments,
  saveUnassignments,
} from "../src/lib/repositories/unassignments";

describe("sqlite persistence", () => {
  let tempDir: string;
  let originalCwd: string;

  before(async () => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdse-db-"));
    fs.mkdirSync(path.join(tempDir, "data"), { recursive: true });
    fs.mkdirSync(path.join(tempDir, "node_modules", "sql.js", "dist"), {
      recursive: true,
    });
    fs.copyFileSync(
      path.join(originalCwd, "node_modules/sql.js/dist/sql-wasm.wasm"),
      path.join(tempDir, "node_modules/sql.js/dist/sql-wasm.wasm"),
    );
    resetDbConnection();
    process.chdir(tempDir);
  });

  after(() => {
    resetDbConnection();
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("saves technicians and week snapshots to disk", async () => {
    await upsertTechnicians([
      { name: "Ana", accountId: "acc-ana", team: "N1", active: true },
    ]);
    const technicians = await listTechnicians();
    assert.equal(technicians.length, 1);

    await saveWeekSnapshot({
      id: "2026-W38",
      label: "Semana 38",
      start: "2026-09-14",
      end: "2026-09-20",
      created: 1,
      resolved: 1,
      open: 0,
      stale: 0,
      unassigned: 0,
      reopened: 0,
      byTechnician: [
        {
          id: technicians[0].id,
          open: 0,
          resolved: 1,
          created: 1,
          avgResolutionDays: 1.5,
        },
      ],
      syncedAt: new Date().toISOString(),
    });

    resetDbConnection();
    await getDb();

    const week = await getWeekSnapshot("2026-W38");
    assert.ok(week);
    assert.equal(week!.resolved, 1);
    assert.equal(week!.byTechnician[0].avgResolutionDays, 1.5);
    assert.ok(fs.existsSync(path.join(tempDir, "data/pdse.sqlite")));
  });

  it("keeps unassignments for the week", async () => {
    await saveUnassignments([
      {
        key: "PDSE-9",
        summary: "Red",
        at: "2026-10-14T15:00:00.000Z",
        from: "Ana López",
        author: "Ana López",
      },
    ]);
    resetDbConnection();
    const rows = await listUnassignments("2026-W42");
    assert.equal(rows.length, 1);
    assert.match(rows[0].message, /Ana López se desasignó PDSE-9/);
  });
});
