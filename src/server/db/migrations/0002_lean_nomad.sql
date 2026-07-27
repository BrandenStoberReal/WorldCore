ALTER TABLE `extensions` ADD `display_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `extensions` ADD `author` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `extensions` ADD `description` text DEFAULT '';--> statement-breakpoint
ALTER TABLE `extensions` ADD `git_url` text;--> statement-breakpoint
ALTER TABLE `extensions` ADD `branch` text;--> statement-breakpoint
ALTER TABLE `extensions` ADD `scope` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `extensions` ADD `manifest_cache` text;--> statement-breakpoint
ALTER TABLE `extensions` ADD `installed_at` text;--> statement-breakpoint
ALTER TABLE `extensions` ADD `last_updated_at` text;