import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyIssueChange, unassignChangesFromIssues, unassignNotices } from "../src/lib/live-changes";

describe("applyIssueChange", () => {
  it("reports status changes and new issues", () => {
    const notices = applyIssueChange(
      [
        {
          key: "PDSE-1",
          summary: "Uno",
          status: "Open",
          assignee: "Ana",
          updated: "2026-09-29T10:00:00.000Z",
          created: "2026-09-28T10:00:00.000Z",
        },
      ],
      [
        {
          key: "PDSE-1",
          summary: "Uno",
          status: "Done",
          assignee: "Ana",
          updated: "2026-09-29T12:00:00.000Z",
          created: "2026-09-28T10:00:00.000Z",
        },
        {
          key: "PDSE-2",
          summary: "Dos",
          status: "Open",
          assignee: null,
          updated: "2026-09-29T12:01:00.000Z",
          created: new Date().toISOString(),
        },
      ],
    );
    assert.equal(notices.some((notice) => notice.kind === "estado"), true);
    assert.equal(notices.some((notice) => notice.kind === "creado"), true);
  });

  it("names the technician who cleared the assignee", () => {
    const [self, byOther] = unassignNotices([
      {
        key: "PDSE-3",
        summary: "Impresora",
        at: "2026-09-29T12:00:00.000Z",
        from: "Ana López",
        author: "Ana López",
      },
      {
        key: "PDSE-4",
        summary: "Acceso",
        at: "2026-09-29T12:05:00.000Z",
        from: "Ana López",
        author: "Bruno Méndez",
      },
    ]);
    assert.equal(self.kind, "desasignado");
    assert.match(self.message, /Ana López se desasignó PDSE-3/);
    assert.match(byOther.message, /Bruno Méndez desasignó a Ana López de PDSE-4/);
  });

  it("keeps only unassignments inside the week window", () => {
    const changes = unassignChangesFromIssues(
      [
        {
          key: "PDSE-9",
          summary: "Red",
          changelog: {
            histories: [
              {
                created: "2026-10-12T15:00:00.000Z",
                author: { displayName: "Ana López" },
                items: [{ field: "assignee", fromString: "Ana López", toString: null }],
              },
              {
                created: "2026-10-14T15:00:00.000Z",
                author: { displayName: "Ana López" },
                items: [{ field: "assignee", fromString: "Ana López", toString: null }],
              },
            ],
          },
        },
      ],
      {
        startMs: new Date("2026-10-13T00:00:00").getTime(),
        endMs: new Date("2026-10-19T23:59:59.999").getTime(),
      },
    );
    assert.equal(changes.length, 1);
    assert.equal(changes[0].at, "2026-10-14T15:00:00.000Z");
  });
});
