import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  daysBetween,
  wasReopenedInRange,
  type JiraIssue,
} from "../src/lib/jira/client";
import {
  collectResolvedIssues,
  computeWeekMetricsForTest,
} from "../src/lib/jira/sync-week";
import { rangeFromMonthId, rangeFromWeekId, weekIdFromDate } from "../src/lib/weeks";

function issue(partial: {
  key: string;
  created: string;
  updated?: string;
  resolutiondate?: string | null;
  resolution?: string | null;
  accountId?: string | null;
  done?: boolean;
  changelog?: JiraIssue["changelog"];
}): JiraIssue {
  return {
    id: partial.key,
    key: partial.key,
    fields: {
      created: partial.created,
      updated: partial.updated ?? partial.created,
      resolutiondate: partial.resolutiondate ?? null,
      resolution:
        partial.resolution === null
          ? null
          : partial.resolution
            ? { name: partial.resolution }
            : partial.resolutiondate
              ? { name: "Listo" }
              : null,
      assignee: partial.accountId
        ? { accountId: partial.accountId, displayName: partial.accountId }
        : null,
      status: {
        name: partial.done ? "Done" : "In Progress",
        statusCategory: {
          key: partial.done ? "done" : "indeterminate",
          name: partial.done ? "Done" : "In Progress",
        },
      },
    },
    changelog: partial.changelog,
  };
}

describe("weeks", () => {
  it("builds ISO week ranges", () => {
    const range = rangeFromWeekId("2026-W38");
    assert.equal(range.start, "2026-09-14");
    assert.equal(range.end, "2026-09-20");
    assert.match(range.label, /Semana 38/);
  });

  it("derives week ids", () => {
    assert.equal(weekIdFromDate(new Date(2026, 8, 16)), "2026-W38");
  });

  it("builds calendar month ranges", () => {
    const october = rangeFromMonthId("2026-10");
    assert.equal(october.start, "2026-10-01");
    assert.equal(october.end, "2026-10-31");
    assert.equal(october.label, "Octubre 2026");
    assert.equal(rangeFromMonthId("2024-02").end, "2024-02-29");
  });
});

describe("jira metrics", () => {
  it("computes created/resolved/open and per-technician stats", () => {
    const technicians = [
      { id: "t1", accountId: "a1" },
      { id: "t2", accountId: "a2" },
    ];
    const created = [
      issue({
        key: "PDSE-1",
        created: "2026-09-15T10:00:00.000Z",
        accountId: "a1",
      }),
      issue({
        key: "PDSE-2",
        created: "2026-09-16T10:00:00.000Z",
        accountId: "a2",
      }),
    ];
    const resolved = [
      issue({
        key: "PDSE-1",
        created: "2026-09-10T10:00:00.000Z",
        resolutiondate: "2026-09-15T18:00:00.000Z",
        accountId: "a1",
        done: true,
      }),
    ];
    const open = [
      issue({
        key: "PDSE-2",
        created: "2026-09-16T10:00:00.000Z",
        updated: "2026-09-19T10:00:00.000Z",
        accountId: "a2",
      }),
      issue({
        key: "PDSE-3",
        created: "2026-09-01T10:00:00.000Z",
        updated: "2026-09-10T10:00:00.000Z",
        accountId: null,
      }),
    ];

    const snapshot = computeWeekMetricsForTest(
      "2026-W38",
      "Semana 38",
      "2026-09-14",
      "2026-09-20",
      { created, resolved, open, changelogPool: [] },
      technicians,
    );

    assert.equal(snapshot.created, 2);
    assert.equal(snapshot.resolved, 1);
    assert.equal(snapshot.open, 2);
    assert.equal(snapshot.unassigned, 1);
    assert.equal(snapshot.stale, 1);
    assert.equal(snapshot.byTechnician[0].resolved, 1);
    assert.equal(snapshot.byTechnician[1].open, 1);
    assert.ok(snapshot.byTechnician[0].avgResolutionDays > 0);
  });

  it("detects reopen transitions", () => {
    const reopened = issue({
      key: "PDSE-9",
      created: "2026-09-01T00:00:00.000Z",
      changelog: {
        histories: [
          {
            created: "2026-09-16T12:00:00.000Z",
            items: [
              {
                field: "status",
                fromString: "Done",
                toString: "In Progress",
              },
            ],
          },
        ],
      },
    });
    assert.equal(wasReopenedInRange(reopened, "2026-09-14", "2026-09-20"), true);
    assert.equal(wasReopenedInRange(reopened, "2026-09-01", "2026-09-07"), false);
  });

  it("keeps resolved tickets that belong to a known technician", () => {
    const tickets = collectResolvedIssues(
      "2026-W38",
      "2026-09-14",
      "2026-09-20",
      [
        issue({
          key: "PDSE-1",
          created: "2026-09-10T10:00:00.000Z",
          resolutiondate: "2026-09-15T18:00:00.000Z",
          accountId: "a1",
          done: true,
        }),
        issue({
          key: "PDSE-9",
          created: "2026-09-10T10:00:00.000Z",
          resolutiondate: "2026-09-15T18:00:00.000Z",
          accountId: "unknown",
          done: true,
        }),
      ],
      [{ id: "t1", accountId: "a1" }],
    );
    assert.equal(tickets.length, 1);
    assert.equal(tickets[0].issueKey, "PDSE-1");
    assert.equal(tickets[0].technicianId, "t1");
    assert.equal(tickets[0].summary, "PDSE-1");
    assert.equal(tickets[0].resolution, "Listo");
  });

  it("skips tickets that have no resolution", () => {
    const tickets = collectResolvedIssues(
      "2026-W38",
      "2026-09-14",
      "2026-09-20",
      [
        issue({
          key: "PDSE-8",
          created: "2026-09-10T10:00:00.000Z",
          resolutiondate: "2026-09-15T18:00:00.000Z",
          resolution: null,
          accountId: "a1",
          done: true,
        }),
      ],
      [{ id: "t1", accountId: "a1" }],
    );
    assert.equal(tickets.length, 0);
  });

  it("measures resolution days", () => {
    const days = daysBetween(
      "2026-09-10T10:00:00.000Z",
      "2026-09-12T10:00:00.000Z",
    );
    assert.equal(days, 2);
  });
});
