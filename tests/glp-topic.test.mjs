import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { registerHooks } from 'node:module';
import { GLP_TOPIC } from '../research/topics.ts';
const db = new DatabaseSync(':memory:');
db.exec('CREATE TABLE research_records (id TEXT,title TEXT,url TEXT,year INTEGER,provider TEXT,document TEXT,kind TEXT,abstract TEXT)');
globalThis.__topicTestEnv = { DB: { prepare(sql) { return { bind(...args) { return { async all() { return { results: db.prepare(sql).all(...args) }; } }; } }; } } };
registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'cloudflare:workers') return { url: 'data:text/javascript,export const env = globalThis.__topicTestEnv;', shortCircuit: true };
  if (specifier.endsWith('/research/topics')) return next(specifier + '.ts', context);
  return next(specifier, context);
} });
const { GET } = await import('../app/api/research/latest/route.ts');
const insert = db.prepare("INSERT INTO research_records VALUES (?, ?, 'https://example.org', 2025, 'Test', '{}', 'Publication', ?)");
test('GLP umbrella finds hormone families and drug names while retaining T1D scope', async () => {
  for (const [i, term] of ['GLP-1', 'GLP-2', 'GIP receptor', 'tirzepatide', 'retatrutide', 'triple receptor agonist', 'amylin', 'cagrilintide'].entries()) {
    db.exec('DELETE FROM research_records');
    insert.run('match', `Study of ${term}`, 'type 1 diabetes');
    insert.run('unrelated', 'HLA study', 'type 1 diabetes');
    insert.run('t2d', `Study of ${term}`, 'type 2 diabetes');
    const response = await GET(new Request('https://example.org/api/research/latest?topic=' + encodeURIComponent(GLP_TOPIC)));
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).items.map(x => x.id), ['match'], term);
  }
});
test('empty GLP results and unknown categories are explicit', async () => {
  db.exec('DELETE FROM research_records');
  const response = await GET(new Request('https://example.org/api/research/latest?topic=' + encodeURIComponent(GLP_TOPIC)));
  assert.deepEqual((await response.json()).items, []);
  assert.equal((await GET(new Request('https://example.org/api/research/latest?topic=unknown'))).status, 400);
});
