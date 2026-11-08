import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, primaryKey, index, check } from "drizzle-orm/sqlite-core";

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

// Unified evidence graph (0002). Raw SQL also defines history triggers; preserve them in future migrations.
export const evidenceEntities = sqliteTable("evidence_entities", {
  id: text("id").primaryKey(), name: text("name").notNull(), category: text("category").notNull(),
});
export const evidenceAliases = sqliteTable("evidence_aliases", {
  id:text("id").primaryKey(), entityId:text("entity_id").notNull().references(()=>evidenceEntities.id), basis:text("basis").notNull(),
}, t=>[check("evidence_alias_id",sql`length(${t.id})>0`)]);
export const evidenceRuns = sqliteTable("evidence_runs", {
  id:text("id").primaryKey(), gene:text("gene").notNull(), geneId:text("gene_id"),
  retrievedAt:text("retrieved_at").notNull(), queryLog:text("query_log").notNull(),
  quarantined:text("quarantined").notNull(), assertionCount:integer("assertion_count").notNull(),
}, t=>[index("evidence_runs_gene").on(t.gene,t.retrievedAt)]);
export const evidenceAssertions = sqliteTable("evidence_assertions", {
  id:text("id").primaryKey(), subjectId:text("subject_id").notNull().references(()=>evidenceEntities.id),
  objectId:text("object_id").notNull().references(()=>evidenceEntities.id),predicate:text("predicate").notNull(),
  provider:text("provider").notNull(),review:text("review").notNull().default("unreviewed"),
  currentVersion:text("current_version").notNull(),retrievedAt:text("retrieved_at").notNull(),
}, t=>[index("evidence_subject").on(t.subjectId,t.review,t.predicate),index("evidence_object").on(t.objectId,t.review,t.predicate),check("evidence_review_state",sql`${t.review} IN ('unreviewed','reviewed','rejected')`)]);
export const evidenceAssertionVersions = sqliteTable("evidence_assertion_versions", {
  id:text("id").primaryKey(),assertionId:text("assertion_id").notNull().references(()=>evidenceAssertions.id),
  document:text("document").notNull(),createdAt:text("created_at").notNull(),
}, t=>[index("evidence_version_assertion").on(t.assertionId,t.createdAt)]);
export const evidenceRunAssertions = sqliteTable("evidence_run_assertions", {
  runId:text("run_id").notNull().references(()=>evidenceRuns.id),assertionId:text("assertion_id").notNull().references(()=>evidenceAssertions.id),
  versionId:text("version_id").notNull().references(()=>evidenceAssertionVersions.id),
}, t=>[primaryKey({columns:[t.runId,t.assertionId]})]);
export const evidenceDocuments = sqliteTable("evidence_documents", {
  id:text("id").primaryKey(),document:text("document").notNull(),retrievedAt:text("retrieved_at").notNull(),
});
export const evidenceDocumentVersions = sqliteTable("evidence_document_versions", {
  id:text("id").primaryKey(),documentId:text("document_id").notNull().references(()=>evidenceDocuments.id),document:text("document").notNull(),retrievedAt:text("retrieved_at").notNull(),
});
export const evidenceRunDocuments = sqliteTable("evidence_run_documents", {
  runId:text("run_id").notNull().references(()=>evidenceRuns.id),documentId:text("document_id").notNull().references(()=>evidenceDocuments.id),
}, t=>[primaryKey({columns:[t.runId,t.documentId]})]);
export const evidenceCitations = sqliteTable("evidence_citations", {
  assertionId:text("assertion_id").notNull().references(()=>evidenceAssertions.id),sourceId:text("source_id").notNull(),role:text("role").notNull().default("cited"),
}, t=>[primaryKey({columns:[t.assertionId,t.sourceId]}),index("evidence_citation_source").on(t.sourceId),check("evidence_citation_role",sql`${t.role} IN ('cited','supports','contradicts','inconclusive')`)]);
export const evidenceDocumentLinks = sqliteTable("evidence_document_links", {
  documentId:text("document_id").notNull().references(()=>evidenceDocuments.id),relatedId:text("related_id").notNull(),relation:text("relation").notNull().default("registry_reference"),
}, t=>[primaryKey({columns:[t.documentId,t.relatedId]})]);
export const evidenceReviews = sqliteTable("evidence_reviews", {
  id:text("id").primaryKey(),assertionId:text("assertion_id").notNull().references(()=>evidenceAssertions.id),
  versionId:text("version_id").notNull().references(()=>evidenceAssertionVersions.id),reviewer:text("reviewer").notNull(),decision:text("decision").notNull(),note:text("note").notNull(),createdAt:text("created_at").notNull(),
});
export const researchRecordHistory = sqliteTable("research_record_history", {
  version:integer("version").primaryKey({autoIncrement:true}),recordId:text("record_id").notNull(),document:text("document").notNull(),archivedAt:text("archived_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
}, t=>[index("research_history_record").on(t.recordId,t.version)]);
export const researchMigrationRows = sqliteTable("research_migration_rows", {
  source:text("source").notNull(),tableName:text("table_name").notNull(),rowId:text("row_id").notNull(),digest:text("digest").notNull(),document:text("document").notNull(),importedAt:text("imported_at").notNull(),
}, t=>[primaryKey({columns:[t.source,t.tableName,t.rowId,t.digest]})]);
export const researchMigrationBatches = sqliteTable("research_migration_batches", {
  source:text("source").notNull(),snapshot:text("snapshot").notNull(),batch:integer("batch").notNull(),count:integer("count").notNull(),completedAt:text("completed_at").notNull(),
}, t=>[primaryKey({columns:[t.source,t.snapshot,t.batch]})]);
