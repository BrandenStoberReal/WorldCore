CREATE TABLE `characters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`avatar` text NOT NULL,
	`file_name` text NOT NULL,
	`json_data` text NOT NULL,
	`spec` text NOT NULL,
	`spec_version` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`creator` text DEFAULT '',
	`character_version` text DEFAULT '',
	`create_date` text NOT NULL,
	`date_added` integer NOT NULL,
	`date_last_chat` integer DEFAULT 0 NOT NULL,
	`chat_size` integer DEFAULT 0 NOT NULL,
	`data_size` integer DEFAULT 0 NOT NULL,
	`fav` integer DEFAULT false NOT NULL,
	`user_id` text DEFAULT 'default-user' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_id` text NOT NULL,
	`file_name` text NOT NULL,
	`character_id` integer,
	`group_id` text,
	`file_size` integer DEFAULT 0 NOT NULL,
	`message_count` integer DEFAULT 0 NOT NULL,
	`last_message` text,
	`last_mes_date` integer,
	`user_id` text DEFAULT 'default-user' NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chats_file_id_unique` ON `chats` (`file_id`);--> statement-breakpoint
CREATE TABLE `connection_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`data` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `extensions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`version` text DEFAULT '' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`settings` text DEFAULT '{}',
	`user_id` text DEFAULT 'default-user' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_name` text NOT NULL,
	`original_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size` integer NOT NULL,
	`folder` text NOT NULL,
	`user_id` text DEFAULT 'default-user' NOT NULL,
	`uploaded_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`members` text DEFAULT '[]' NOT NULL,
	`avatar_url` text DEFAULT '' NOT NULL,
	`allow_self_responses` integer DEFAULT false NOT NULL,
	`activation_strategy` integer DEFAULT 0 NOT NULL,
	`generation_mode` integer DEFAULT 0 NOT NULL,
	`disabled_members` text DEFAULT '[]' NOT NULL,
	`fav` integer DEFAULT false NOT NULL,
	`chat_id` text DEFAULT '',
	`chats` text DEFAULT '[]' NOT NULL,
	`auto_mode_delay` integer DEFAULT 5 NOT NULL,
	`gen_mode_join_prefix` text DEFAULT '',
	`gen_mode_join_suffix` text DEFAULT '',
	`date_added` integer NOT NULL,
	`create_date` text NOT NULL,
	`date_last_chat` integer DEFAULT 0 NOT NULL,
	`chat_size` integer DEFAULT 0 NOT NULL,
	`user_id` text DEFAULT 'default-user' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `image_metadata` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_name` text NOT NULL,
	`folder` text NOT NULL,
	`width` integer,
	`height` integer,
	`size` integer,
	`mime_type` text,
	`user_id` text DEFAULT 'default-user' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `image_metadata_file_name_unique` ON `image_metadata` (`file_name`);--> statement-breakpoint
CREATE TABLE `moving_ui_state` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text DEFAULT 'default-user' NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `moving_ui_state_user_id_unique` ON `moving_ui_state` (`user_id`);--> statement-breakpoint
CREATE TABLE `presets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`user_id` text DEFAULT 'default-user' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quick_replies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`user_id` text DEFAULT 'default-user' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `secrets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`user_id` text DEFAULT 'default-user' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text DEFAULT 'default-user' NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_user_id_unique` ON `settings` (`user_id`);--> statement-breakpoint
CREATE TABLE `settings_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`user_id` text DEFAULT 'default-user' NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text DEFAULT 'default-user' NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `themes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`user_id` text DEFAULT 'default-user' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `themes_name_unique` ON `themes` (`name`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`handle` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text,
	`role` text DEFAULT 'user' NOT NULL,
	`avatar` text DEFAULT '',
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_handle_unique` ON `users` (`handle`);--> statement-breakpoint
CREATE TABLE `vector_stores` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`vector` blob NOT NULL,
	`metadata` text DEFAULT '{}',
	`user_id` text DEFAULT 'default-user' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `worldinfo_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_id` integer,
	`uid` text NOT NULL,
	`keys` text DEFAULT '[]' NOT NULL,
	`keysecondary` text DEFAULT '[]' NOT NULL,
	`comment` text DEFAULT '',
	`content` text NOT NULL,
	`constant` integer DEFAULT false NOT NULL,
	`vectorized` integer DEFAULT false NOT NULL,
	`selective` integer DEFAULT false NOT NULL,
	`selective_logic` integer DEFAULT 0 NOT NULL,
	`add_memo` integer DEFAULT false NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`disable` integer DEFAULT false NOT NULL,
	`exclude_recursion` integer DEFAULT false NOT NULL,
	`prevent_recursion` integer DEFAULT false NOT NULL,
	`delay_until_recursion` integer DEFAULT false NOT NULL,
	`probability` real DEFAULT 0 NOT NULL,
	`use_probability` integer DEFAULT false NOT NULL,
	`depth` integer DEFAULT 0 NOT NULL,
	`group` text DEFAULT '',
	`group_override` integer DEFAULT false NOT NULL,
	`group_weight` real DEFAULT 0 NOT NULL,
	`scan_depth` integer,
	`case_sensitive` integer,
	`match_whole_words` integer,
	`automation_id` text DEFAULT '',
	`role` text DEFAULT '',
	`sticky` integer,
	`cooldown` integer,
	`delay` integer,
	`match_persona_description` integer DEFAULT false NOT NULL,
	`match_character_description` integer DEFAULT false NOT NULL,
	`match_character_personality` integer DEFAULT false NOT NULL,
	`match_character_depth_prompt` integer DEFAULT false NOT NULL,
	`match_scenario` integer DEFAULT false NOT NULL,
	`match_creator_notes` integer DEFAULT false NOT NULL,
	`ignore_budget` integer DEFAULT false NOT NULL,
	`extensions` text DEFAULT '{}',
	FOREIGN KEY (`file_id`) REFERENCES `worldinfo_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `worldinfo_files` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_name` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`user_id` text DEFAULT 'default-user' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `worldinfo_files_file_name_unique` ON `worldinfo_files` (`file_name`);