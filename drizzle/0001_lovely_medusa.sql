CREATE TABLE `research_import_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`count` integer NOT NULL,
	`status` text NOT NULL,
	`detail` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`cursor` text NOT NULL,
	`state` text NOT NULL,
	`total` integer NOT NULL,
	`processed` integer NOT NULL,
	`updated` text NOT NULL,
	`error` text,
	`lease` text,
	`lease_until` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `research_records` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`year` integer NOT NULL,
	`doi` text,
	`pmcid` text,
	`url` text NOT NULL,
	`abstract` text NOT NULL,
	`license` text,
	`full_text` text,
	`full_text_status` text NOT NULL,
	`document` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX research_provider_idx ON research_records(provider);
--> statement-breakpoint
CREATE INDEX research_fulltext_idx ON research_records(full_text_status);
--> statement-breakpoint
CREATE VIRTUAL TABLE research_fts USING fts5(id UNINDEXED, title, abstract, full_text, document);
--> statement-breakpoint
CREATE TRIGGER research_insert AFTER INSERT ON research_records BEGIN
INSERT INTO research_fts(id,title,abstract,full_text,document) VALUES (new.id,new.title,new.abstract,coalesce(new.full_text,''),new.document);
END;
--> statement-breakpoint
CREATE TRIGGER research_update AFTER UPDATE ON research_records BEGIN
DELETE FROM research_fts WHERE id=old.id;
INSERT INTO research_fts(id,title,abstract,full_text,document) VALUES (new.id,new.title,new.abstract,coalesce(new.full_text,''),new.document);
END;
--> statement-breakpoint
CREATE TRIGGER research_delete AFTER DELETE ON research_records BEGIN
DELETE FROM research_fts WHERE id=old.id;
END;
