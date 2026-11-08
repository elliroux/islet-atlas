-- Additive evidence graph. Existing records, FTS, notebooks and checkpoints are untouched.
CREATE TABLE evidence_entities (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL
);
CREATE TABLE evidence_aliases (
  id TEXT PRIMARY KEY, entity_id TEXT NOT NULL REFERENCES evidence_entities(id),
  basis TEXT NOT NULL, CHECK(length(id)>0)
);
CREATE TABLE evidence_runs (
  id TEXT PRIMARY KEY, gene TEXT NOT NULL, gene_id TEXT,
  retrieved_at TEXT NOT NULL, query_log TEXT NOT NULL,
  quarantined TEXT NOT NULL, assertion_count INTEGER NOT NULL
);
CREATE INDEX evidence_runs_gene ON evidence_runs(gene,retrieved_at DESC);
CREATE TABLE evidence_assertions (
  id TEXT PRIMARY KEY, subject_id TEXT NOT NULL REFERENCES evidence_entities(id),
  object_id TEXT NOT NULL REFERENCES evidence_entities(id), predicate TEXT NOT NULL,
  provider TEXT NOT NULL, review TEXT NOT NULL DEFAULT 'unreviewed'
    CHECK(review IN ('unreviewed','reviewed','rejected')),
  current_version TEXT NOT NULL, retrieved_at TEXT NOT NULL
);
CREATE INDEX evidence_subject ON evidence_assertions(subject_id,review,predicate);
CREATE INDEX evidence_object ON evidence_assertions(object_id,review,predicate);
CREATE TABLE evidence_assertion_versions (
  id TEXT PRIMARY KEY, assertion_id TEXT NOT NULL REFERENCES evidence_assertions(id),
  document TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX evidence_version_assertion ON evidence_assertion_versions(assertion_id,created_at);
CREATE TABLE evidence_run_assertions (
  run_id TEXT NOT NULL REFERENCES evidence_runs(id), assertion_id TEXT NOT NULL REFERENCES evidence_assertions(id),
  version_id TEXT NOT NULL REFERENCES evidence_assertion_versions(id),
  PRIMARY KEY(run_id,assertion_id)
);
CREATE TABLE evidence_documents (
  id TEXT PRIMARY KEY, document TEXT NOT NULL, retrieved_at TEXT NOT NULL
);
CREATE TABLE evidence_document_versions (
  id TEXT PRIMARY KEY, document_id TEXT NOT NULL REFERENCES evidence_documents(id),
  document TEXT NOT NULL, retrieved_at TEXT NOT NULL
);
CREATE TABLE evidence_run_documents (
  run_id TEXT NOT NULL REFERENCES evidence_runs(id), document_id TEXT NOT NULL REFERENCES evidence_documents(id),
  PRIMARY KEY(run_id,document_id)
);
-- A source citation is not automatically support, contradiction, or an independent cohort.
CREATE TABLE evidence_citations (
  assertion_id TEXT NOT NULL REFERENCES evidence_assertions(id), source_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cited' CHECK(role IN ('cited','supports','contradicts','inconclusive')),
  PRIMARY KEY(assertion_id,source_id)
);
CREATE INDEX evidence_citation_source ON evidence_citations(source_id);
CREATE TABLE evidence_document_links (
  document_id TEXT NOT NULL REFERENCES evidence_documents(id), related_id TEXT NOT NULL,
  relation TEXT NOT NULL DEFAULT 'registry_reference',
  PRIMARY KEY(document_id,related_id)
);
CREATE TABLE evidence_reviews (
  id TEXT PRIMARY KEY, assertion_id TEXT NOT NULL REFERENCES evidence_assertions(id),
  version_id TEXT NOT NULL REFERENCES evidence_assertion_versions(id),
  reviewer TEXT NOT NULL, decision TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL
);
-- Preserve the exact prior source record before existing importers refresh metadata or full text.
CREATE TABLE research_record_history (
  version INTEGER PRIMARY KEY AUTOINCREMENT, record_id TEXT NOT NULL,
  document TEXT NOT NULL, archived_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX research_history_record ON research_record_history(record_id,version);
CREATE TRIGGER research_archive_before_update BEFORE UPDATE ON research_records
WHEN old.title IS NOT new.title OR old.document IS NOT new.document OR old.abstract IS NOT new.abstract
 OR old.full_text IS NOT new.full_text OR old.license IS NOT new.license OR old.full_text_status IS NOT new.full_text_status
 OR old.year IS NOT new.year OR old.doi IS NOT new.doi OR old.pmcid IS NOT new.pmcid OR old.url IS NOT new.url
BEGIN
 INSERT INTO research_record_history(record_id,document) VALUES(old.id,json_object(
 'id',old.id,'provider',old.provider,'kind',old.kind,'title',old.title,'year',old.year,
 'doi',old.doi,'pmcid',old.pmcid,'url',old.url,'abstract',old.abstract,'license',old.license,
 'full_text',old.full_text,'full_text_status',old.full_text_status,'document',old.document,'updated',old.updated));
END;
-- Migration archives preserve source versions/checkpoints without replacing destination records.
CREATE TABLE research_migration_rows (
  source TEXT NOT NULL, table_name TEXT NOT NULL, row_id TEXT NOT NULL, digest TEXT NOT NULL,
  document TEXT NOT NULL, imported_at TEXT NOT NULL,
  PRIMARY KEY(source,table_name,row_id,digest)
);
CREATE TABLE research_migration_batches (
  source TEXT NOT NULL, snapshot TEXT NOT NULL, batch INTEGER NOT NULL,
  count INTEGER NOT NULL, completed_at TEXT NOT NULL,
  PRIMARY KEY(source,snapshot,batch)
);
