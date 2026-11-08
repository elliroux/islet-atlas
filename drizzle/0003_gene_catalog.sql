CREATE TABLE `gene_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`symbol` text NOT NULL,
	`document` text NOT NULL,
	`first_seen` text NOT NULL,
	`last_seen` text NOT NULL,
	`last_attempt` text,
	`last_success` text,
	`next_attempt` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`detail` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `gene_catalog_symbol` ON `gene_catalog` (`symbol`);--> statement-breakpoint
CREATE INDEX `gene_catalog_due` ON `gene_catalog` (`next_attempt`,`id`);--> statement-breakpoint
CREATE TABLE `gene_catalog_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`cursor` text DEFAULT '' NOT NULL,
	`scan_started` text,
	`last_page` text,
	`last_complete` text,
	`next_scan` integer DEFAULT 0 NOT NULL,
	`error` text,
	`lease` text,
	`lease_until` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gene_catalog_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`gene_id` text NOT NULL,
	`document` text NOT NULL,
	`retrieved_at` text NOT NULL
);
