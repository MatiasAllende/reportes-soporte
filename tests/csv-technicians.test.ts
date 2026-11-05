import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTechniciansCsv } from "../src/lib/csv-technicians";

describe("parseTechniciansCsv", () => {
  it("accepts a valid file", () => {
    const csv = `name,accountId,team,active
Ana López,acc-1,N1,true
Bruno Méndez,acc-2,N1,1
`;
    const result = parseTechniciansCsv(csv);
    assert.equal(result.rejected.length, 0);
    assert.equal(result.accepted.length, 2);
    assert.equal(result.accepted[0].accountId, "acc-1");
    assert.equal(result.accepted[1].active, true);
  });

  it("rejects the whole file when a row is invalid", () => {
    const csv = `name,accountId
Ana,acc-1
,acc-2
`;
    const result = parseTechniciansCsv(csv);
    assert.equal(result.accepted.length, 0);
    assert.ok(result.rejected.length >= 1);
  });

  it("rejects duplicate accountIds", () => {
    const csv = `name,accountId
Ana,acc-1
Bruno,acc-1
`;
    const result = parseTechniciansCsv(csv);
    assert.equal(result.accepted.length, 0);
    assert.match(result.rejected[0].reason, /duplicado/i);
  });

  it("supports Spanish headers", () => {
    const csv = `nombre,accountId,equipo,activo
Ana,acc-1,N1,si
`;
    const result = parseTechniciansCsv(csv);
    assert.equal(result.accepted.length, 1);
    assert.equal(result.accepted[0].name, "Ana");
    assert.equal(result.accepted[0].team, "N1");
  });
});
