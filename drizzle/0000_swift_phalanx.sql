CREATE TABLE `investigations` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`revision` integer NOT NULL,
	`updated` text NOT NULL,
	`document` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
