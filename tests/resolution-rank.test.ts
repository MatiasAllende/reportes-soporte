import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listMostResolvers, pickMostAndLeast, rankResolutions } from "../src/lib/resolution-rank";

describe("resolution rank", () => {
  it("returns the three highest and three lowest without repeating a person", () => {
    const rows = [
      { id: "a", resolved: 10 },
      { id: "b", resolved: 8 },
      { id: "c", resolved: 4 },
      { id: "d", resolved: 1 },
      { id: "e", resolved: 0 },
      { id: "f", resolved: 0 },
    ];
    const { most, least } = pickMostAndLeast(rows);
    assert.deepEqual(most.map((row) => row.id), ["a", "b", "c"]);
    assert.deepEqual(least.map((row) => row.id), ["d"]);
    assert.equal(pickMostAndLeast(rows).withoutResolution, 2);
  });

  it("groups tickets by the resolution name", () => {
    const { most } = rankResolutions(
      [{ id: "t1", name: "Ana", accountId: "a1" }],
      [
        {
          key: "PDSE-1",
          summary: "Uno",
          resolution: "Listo",
          resolvedAt: "2026-10-14T12:00:00.000Z",
          accountId: "a1",
        },
        {
          key: "PDSE-2",
          summary: "Dos",
          resolution: "Duplicado",
          resolvedAt: "2026-10-15T12:00:00.000Z",
          accountId: "a1",
        },
      ],
      new Map([
        ["PDSE-1", 2],
        ["PDSE-2", 1],
      ]),
    );
    assert.equal(most[0].resolved, 2);
    assert.deepEqual(most[0].byResolution, [
      { name: "Duplicado", count: 1 },
      { name: "Listo", count: 1 },
    ]);
  });

  it("orders the monthly list from most resolved to least", () => {
    const rows = listMostResolvers(
      [
        { id: "t1", name: "Ana", accountId: "a1" },
        { id: "t2", name: "Bruno", accountId: "a2" },
        { id: "t3", name: "Clara", accountId: "a3" },
      ],
      [
        {
          key: "PDSE-1",
          summary: "Uno",
          resolution: "Listo",
          resolvedAt: "2026-10-02T12:00:00.000Z",
          accountId: "a2",
        },
        {
          key: "PDSE-2",
          summary: "Dos",
          resolution: "Listo",
          resolvedAt: "2026-10-03T12:00:00.000Z",
          accountId: "a2",
        },
        {
          key: "PDSE-3",
          summary: "Tres",
          resolution: "Cancelado",
          resolvedAt: "2026-10-04T12:00:00.000Z",
          accountId: "a1",
        },
      ],
      new Map(),
    );
    assert.deepEqual(
      rows.map((row) => row.name),
      ["Bruno", "Ana"],
    );
  });
});
