import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

test("the index migration repairs existing rows and keeps updates, upserts and deletes aligned", () => {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(new URL("../drizzle/0001_lovely_medusa.sql", import.meta.url), "utf8"));
  const insert = db.prepare("INSERT INTO research_records VALUES (?, 'Europe PMC', 'Publication', ?, 2026, NULL, NULL, 'https://example.org', '', NULL, ?, 'Indexed body', '{}', '2026-11-11')");
  insert.run("one", "initial", "cpeptide");
  insert.run("two", "second", null);
  db.exec("UPDATE research_records SET title='revised' WHERE id='one'");
  assert.notEqual(db.prepare("SELECT rowid FROM research_fts WHERE id='one'").get().rowid,
    db.prepare("SELECT rowid FROM research_records WHERE id='one'").get().rowid);
  db.exec(readFileSync(new URL("../drizzle/0003_research_fts_rowids.sql", import.meta.url), "utf8"));
  const aligned = () => assert.equal(db.prepare("SELECT count(*) AS n FROM research_fts f JOIN research_records r ON f.id=r.id WHERE f.rowid != r.rowid").get().n, 0);
  aligned();
  db.exec("INSERT INTO research_records SELECT * FROM research_records WHERE id='one' ON CONFLICT(id) DO UPDATE SET title='upserted'");
  aligned();
  assert.equal(db.prepare("SELECT id FROM research_fts WHERE research_fts MATCH 'upserted'").get().id, "one");
  assert.equal(db.prepare("SELECT id FROM research_fts WHERE research_fts MATCH 'cpeptide'").get().id, "one");
  db.exec("DELETE FROM research_records WHERE id='one'");
  assert.equal(db.prepare("SELECT count(*) AS n FROM research_fts WHERE research_fts MATCH 'cpeptide'").get().n, 0);
  assert.equal(db.prepare("SELECT count(*) AS n FROM research_fts").get().n, 1);
  db.close();
});
