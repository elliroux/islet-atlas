import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const investigations = sqliteTable("investigations", {
  owner: text("owner").notNull(),
  id: text("id").notNull(),
  revision: integer("revision").notNull(),
  updated: text("updated").notNull(),
  document: text("document").notNull(),
}, t => [primaryKey({columns: [t.owner, t.id]})]);

export const researchRecords = sqliteTable("research_records", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  year: integer("year").notNull(),
  doi: text("doi"),
  pmcid: text("pmcid"),
  url: text("url").notNull(),
  abstract: text("abstract").notNull(),
  license: text("license"),
  fullText: text("full_text"),
  fullTextStatus: text("full_text_status").notNull(),
  document: text("document").notNull(),
  updated: text("updated").notNull(),
});
export const researchImports = sqliteTable("research_imports", {
  id: text("id").primaryKey(),
  cursor: text("cursor").notNull(),
  state: text("state").notNull(),
  total: integer("total").notNull(),
  processed: integer("processed").notNull(),
  updated: text("updated").notNull(),
  error: text("error"),
  lease: text("lease"),
  leaseUntil: integer("lease_until").notNull(),
});
export const researchImportRuns = sqliteTable("research_import_runs", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  count: integer("count").notNull(),
  status: text("status").notNull(),
  detail: text("detail").notNull(),
  created: text("created").notNull(),
});
