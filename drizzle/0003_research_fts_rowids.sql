-- Keep the search row identity aligned with the research row. Updates and
-- deletes can then use the FTS rowid index instead of scanning every document.
DROP TRIGGER research_insert;
DROP TRIGGER research_update;
DROP TRIGGER research_delete;

DELETE FROM research_fts;
INSERT INTO research_fts(rowid,id,title,abstract,full_text,document)
SELECT rowid,id,title,abstract,coalesce(full_text,''),document FROM research_records;

CREATE TRIGGER research_insert AFTER INSERT ON research_records BEGIN
INSERT INTO research_fts(rowid,id,title,abstract,full_text,document)
VALUES (new.rowid,new.id,new.title,new.abstract,coalesce(new.full_text,''),new.document);
END;

CREATE TRIGGER research_update AFTER UPDATE ON research_records BEGIN
DELETE FROM research_fts WHERE rowid=old.rowid;
INSERT INTO research_fts(rowid,id,title,abstract,full_text,document)
VALUES (new.rowid,new.id,new.title,new.abstract,coalesce(new.full_text,''),new.document);
END;

CREATE TRIGGER research_delete AFTER DELETE ON research_records BEGIN
DELETE FROM research_fts WHERE rowid=old.rowid;
END;
