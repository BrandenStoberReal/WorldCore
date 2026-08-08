CREATE TABLE `worldinfo_entry_states` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chat_id` text NOT NULL,
	`entry_uid` text NOT NULL,
	`entry_file_id` integer,
	`activated_at_message_index` integer DEFAULT 0 NOT NULL,
	`activation_count` integer DEFAULT 0 NOT NULL,
	`consecutive_matches` integer DEFAULT 0 NOT NULL,
	`last_deactivated_at` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`user_id` text DEFAULT 'default-user' NOT NULL,
	FOREIGN KEY (`entry_file_id`) REFERENCES `worldinfo_files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `worldinfo_entry_states_chat_id_idx` ON `worldinfo_entry_states` (`chat_id`);--> statement-breakpoint
CREATE INDEX `worldinfo_entry_states_entry_uid_idx` ON `worldinfo_entry_states` (`entry_uid`);--> statement-breakpoint
CREATE UNIQUE INDEX `worldinfo_entry_states_chat_id_entry_uid_idx` ON `worldinfo_entry_states` (`chat_id`,`entry_uid`);--> statement-breakpoint
CREATE INDEX `characters_user_id_idx` ON `characters` (`user_id`);--> statement-breakpoint
CREATE INDEX `chats_user_id_idx` ON `chats` (`user_id`);--> statement-breakpoint
CREATE INDEX `chats_character_id_idx` ON `chats` (`character_id`);--> statement-breakpoint
CREATE INDEX `chats_group_id_idx` ON `chats` (`group_id`);--> statement-breakpoint
CREATE INDEX `extensions_user_id_idx` ON `extensions` (`user_id`);--> statement-breakpoint
CREATE INDEX `files_user_id_idx` ON `files` (`user_id`);--> statement-breakpoint
CREATE INDEX `groups_user_id_idx` ON `groups` (`user_id`);--> statement-breakpoint
CREATE INDEX `image_metadata_user_id_idx` ON `image_metadata` (`user_id`);--> statement-breakpoint
CREATE INDEX `personas_user_id_idx` ON `personas` (`user_id`);--> statement-breakpoint
CREATE INDEX `presets_user_id_idx` ON `presets` (`user_id`);--> statement-breakpoint
CREATE INDEX `quick_replies_user_id_idx` ON `quick_replies` (`user_id`);--> statement-breakpoint
CREATE INDEX `secrets_user_id_idx` ON `secrets` (`user_id`);--> statement-breakpoint
CREATE INDEX `stats_user_id_idx` ON `stats` (`user_id`);--> statement-breakpoint
CREATE INDEX `themes_user_id_idx` ON `themes` (`user_id`);--> statement-breakpoint
CREATE INDEX `vector_stores_user_id_idx` ON `vector_stores` (`user_id`);--> statement-breakpoint
CREATE INDEX `worldinfo_entries_file_id_idx` ON `worldinfo_entries` (`file_id`);--> statement-breakpoint
CREATE INDEX `worldinfo_entries_uid_idx` ON `worldinfo_entries` (`uid`);--> statement-breakpoint
CREATE INDEX `worldinfo_entries_file_id_uid_idx` ON `worldinfo_entries` (`file_id`,`uid`);--> statement-breakpoint
CREATE INDEX `worldinfo_files_user_id_idx` ON `worldinfo_files` (`user_id`);