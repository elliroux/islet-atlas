import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

const writes = [];
const db = {
  prepare(sql) {
    let parameters = [];
    return {
      sql,
      get parameters() { return parameters; },
      bind(...values) { parameters = values; return this; },
      async run() { return { meta: { changes: 1 } }; },
      async first() {
        return { id: "trials", cursor: "expired-token", state: "Retry available", total: 4682, processed: 400 };
      },
    };
  },
  async batch(statements) { writes.push(...statements); },
};
globalThis.__registryTestEnv = { DB: db };
registerHooks({
  resolve(specifier, context, next) {
    const mocks = {
      "cloudflare:workers": "export const env = globalThis.__registryTestEnv;",
      "./data": "export const data = { findings: [] };",
    };
    return specifier in mocks
      ? { url: "data:text/javascript," + encodeURIComponent(mocks[specifier]), shortCircuit: true }
      : next(specifier, context);
  },
});
const { importBatch } = await import("../research/foundation.ts");

test("an expired registry page token starts a fresh scan and commits its new checkpoint", async t => {
  writes.length = 0;
  const urls = [];
  t.mock.method(globalThis, "fetch", async url => {
    urls.push(new URL(url));
    if (urls.length === 1) {
      return new Response("The data have probably changed while you were paginating. Please, start over from the first page.", { status: 400 });
    }
    return Response.json({ studies: [], nextPageToken: "fresh-token", totalCount: 4682 });
  });
  const result = await importBatch("trials");
  assert.equal(urls.length, 2);
  assert.equal(urls[0].searchParams.get("pageToken"), "expired-token");
  assert.equal(urls[1].searchParams.has("pageToken"), false);
  assert.equal(result.processed, 0);
  const checkpoint = writes.find(write => write.sql.startsWith("UPDATE research_imports SET cursor"));
  assert.equal(checkpoint.parameters[0], "fresh-token");
  assert.equal(checkpoint.parameters[3], 0);
});

test("other provider errors preserve the interrupted cursor", async t => {
  writes.length = 0;
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    return new Response("Bad request", { status: 400 });
  });
  await assert.rejects(importBatch("trials"), /Provider returned HTTP 400/);
  assert.equal(calls, 1);
  assert.equal(writes.some(write => write.sql.startsWith("UPDATE research_imports SET cursor")), false);
});
