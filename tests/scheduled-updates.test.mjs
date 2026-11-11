import { test } from "node:test";
import assert from "node:assert/strict";
import { researchUpdateDue, runResearchUpdates } from "../research/scheduled-updates.ts";

test("research updates keep New York timing across daylight saving changes", () => {
  assert.equal(researchUpdateDue(Date.parse("2026-11-11T08:00:00Z")), true);
  assert.equal(researchUpdateDue(Date.parse("2026-07-11T07:00:00Z")), true);
  assert.equal(researchUpdateDue(Date.parse("2026-11-11T07:00:00Z")), false);
});

test("each source respects its batch budget and stops at its saved completion", async () => {
  const calls = {};
  await runResearchUpdates(async source => {
    calls[source] = (calls[source] ?? 0) + 1;
    return source === "recent" ? { busy: true } : source === "trials" ? { complete: true } : { count: 100 };
  });
  assert.deepEqual(calls, { atlas: 1, recent: 1, publications: 50, trials: 1, fulltext: 10 });
});

test("a provider failure preserves progress on other sources and fails the run", async () => {
  const calls = [];
  await assert.rejects(runResearchUpdates(async source => {
    calls.push(source);
    if (source === "publications") throw new Error("provider unavailable");
    return { complete: true };
  }), /publications: provider unavailable/);
  assert.deepEqual(calls, ["atlas", "recent", "publications", "trials", "fulltext"]);
});
