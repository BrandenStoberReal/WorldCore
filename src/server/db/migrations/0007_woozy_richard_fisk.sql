PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_extensions` (
	`id` text NOT NULL,
	`name` text NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`version` text DEFAULT '' NOT NULL,
	`author` text DEFAULT '',
	`description` text DEFAULT '',
	`git_url` text,
	`branch` text,
	`subfolder` text,
	`scope` text DEFAULT 'user' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`settings` text DEFAULT '{}',
	`manifest_cache` text,
	`has_update` integer DEFAULT false NOT NULL,
	`installed_at` text,
	`last_updated_at` text,
	`user_id` text DEFAULT 'default-user' NOT NULL,
	PRIMARY KEY(`id`, `user_id`)
);
--> statement-breakpoint
INSERT INTO `__new_extensions`("id", "name", "display_name", "version", "author", "description", "git_url", "branch", "subfolder", "scope", "enabled", "settings", "manifest_cache", "has_update", "installed_at", "last_updated_at", "user_id") SELECT "id", "name", "display_name", "version", "author", "description", "git_url", "branch", "subfolder", "scope", "enabled", "settings", "manifest_cache", "has_update", "installed_at", "last_updated_at", "user_id" FROM `extensions`;--> statement-breakpoint
DROP TABLE `extensions`;--> statement-breakpoint
ALTER TABLE `__new_extensions` RENAME TO `extensions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `extensions_user_id_idx` ON `extensions` (`user_id`);