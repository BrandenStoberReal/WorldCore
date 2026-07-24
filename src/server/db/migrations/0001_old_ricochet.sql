CREATE TABLE `personas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`personality` text DEFAULT '' NOT NULL,
	`scenario` text DEFAULT '' NOT NULL,
	`system_prompt` text DEFAULT '' NOT NULL,
	`avatar` text DEFAULT '' NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`user_id` text DEFAULT 'default-user' NOT NULL,
	`date_added` integer NOT NULL,
	`date_modified` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `characters` ADD `bound_persona_id` integer REFERENCES personas(id);--> statement-breakpoint
ALTER TABLE `presets` ADD `is_default` integer DEFAULT false NOT NULL;