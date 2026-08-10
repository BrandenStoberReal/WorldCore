import { sqliteTable, text, integer, real, blob, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const characters = sqliteTable('characters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  avatar: text('avatar').notNull(),
  fileName: text('file_name').notNull(),
  jsonData: text('json_data').notNull(),
  spec: text('spec').notNull(),
  specVersion: text('spec_version').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
  creator: text('creator').default(''),
  characterVersion: text('character_version').default(''),
  createDate: text('create_date').notNull(),
  dateAdded: integer('date_added').notNull(),
  dateLastChat: integer('date_last_chat').notNull().default(0),
  chatSize: integer('chat_size').notNull().default(0),
  dataSize: integer('data_size').notNull().default(0),
  fav: integer('fav', { mode: 'boolean' }).notNull().default(false),
  userId: text('user_id').notNull().default('default-user'),
  boundPersonaId: integer('bound_persona_id').references(() => personas.id, {
    onDelete: 'set null',
  }),
}, (table) => [
  index('characters_user_id_idx').on(table.userId),
]);

export const personas = sqliteTable('personas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  personality: text('personality').notNull().default(''),
  scenario: text('scenario').notNull().default(''),
  systemPrompt: text('system_prompt').notNull().default(''),
  avatar: text('avatar').notNull().default(''),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  userId: text('user_id').notNull().default('default-user'),
  dateAdded: integer('date_added').notNull(),
  dateModified: integer('date_modified').notNull(),
}, (table) => [
  index('personas_user_id_idx').on(table.userId),
]);

export const chats = sqliteTable('chats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fileId: text('file_id').notNull().unique(),
  fileName: text('file_name').notNull(),
  characterId: integer('character_id').references(() => characters.id, { onDelete: 'cascade' }),
  groupId: text('group_id'),
  fileSize: integer('file_size').notNull().default(0),
  messageCount: integer('message_count').notNull().default(0),
  lastMessage: text('last_message'),
  lastMesDate: integer('last_mes_date'),
  userId: text('user_id').notNull().default('default-user'),
}, (table) => [
  index('chats_user_id_idx').on(table.userId),
  index('chats_character_id_idx').on(table.characterId),
  index('chats_group_id_idx').on(table.groupId),
]);

export const groups = sqliteTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  members: text('members', { mode: 'json' }).$type<string[]>().notNull().default([]),
  avatarUrl: text('avatar_url').notNull().default(''),
  allowSelfResponses: integer('allow_self_responses', { mode: 'boolean' }).notNull().default(false),
  activationStrategy: integer('activation_strategy').notNull().default(0),
  generationMode: integer('generation_mode').notNull().default(0),
  disabledMembers: text('disabled_members', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  fav: integer('fav', { mode: 'boolean' }).notNull().default(false),
  chatId: text('chat_id').default(''),
  chats: text('chats', { mode: 'json' }).$type<string[]>().notNull().default([]),
  autoModeDelay: integer('auto_mode_delay').notNull().default(5),
  genModeJoinPrefix: text('gen_mode_join_prefix').default(''),
  genModeJoinSuffix: text('gen_mode_join_suffix').default(''),
  dateAdded: integer('date_added').notNull(),
  createDate: text('create_date').notNull(),
  dateLastChat: integer('date_last_chat').notNull().default(0),
  chatSize: integer('chat_size').notNull().default(0),
  userId: text('user_id').notNull().default('default-user'),
}, (table) => [
  index('groups_user_id_idx').on(table.userId),
]);

export const worldinfoFiles = sqliteTable('worldinfo_files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fileName: text('file_name').notNull().unique(),
  name: text('name').notNull().default(''),
  userId: text('user_id').notNull().default('default-user'),
}, (table) => [
  index('worldinfo_files_user_id_idx').on(table.userId),
]);

export const worldinfoEntries = sqliteTable('worldinfo_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fileId: integer('file_id').references(() => worldinfoFiles.id, { onDelete: 'cascade' }),
  uid: text('uid').notNull(),
  keys: text('keys', { mode: 'json' }).$type<string[]>().notNull().default([]),
  keysecondary: text('keysecondary', { mode: 'json' }).$type<string[]>().notNull().default([]),
  comment: text('comment').default(''),
  content: text('content').notNull(),
  constant: integer('constant', { mode: 'boolean' }).notNull().default(false),
  vectorized: integer('vectorized', { mode: 'boolean' }).notNull().default(false),
  selective: integer('selective', { mode: 'boolean' }).notNull().default(false),
  selectiveLogic: integer('selective_logic').notNull().default(0),
  addMemo: integer('add_memo', { mode: 'boolean' }).notNull().default(false),
  order: integer('order').notNull().default(0),
  position: integer('position').notNull().default(0),
  disable: integer('disable', { mode: 'boolean' }).notNull().default(false),
  excludeRecursion: integer('exclude_recursion', { mode: 'boolean' }).notNull().default(false),
  preventRecursion: integer('prevent_recursion', { mode: 'boolean' }).notNull().default(false),
  delayUntilRecursion: integer('delay_until_recursion', { mode: 'boolean' })
    .notNull()
    .default(false),
  probability: real('probability').notNull().default(0),
  useProbability: integer('use_probability', { mode: 'boolean' }).notNull().default(false),
  depth: integer('depth').notNull().default(0),
  group: text('group').default(''),
  groupOverride: integer('group_override', { mode: 'boolean' }).notNull().default(false),
  groupWeight: real('group_weight').notNull().default(0),
  scanDepth: integer('scan_depth'),
  caseSensitive: integer('case_sensitive', { mode: 'boolean' }),
  matchWholeWords: integer('match_whole_words', { mode: 'boolean' }),
  automationId: text('automation_id').default(''),
  role: text('role').default(''),
  sticky: integer('sticky'),
  cooldown: integer('cooldown'),
  delay: integer('delay'),
  matchPersonaDescription: integer('match_persona_description', { mode: 'boolean' })
    .notNull()
    .default(false),
  matchCharacterDescription: integer('match_character_description', { mode: 'boolean' })
    .notNull()
    .default(false),
  matchCharacterPersonality: integer('match_character_personality', { mode: 'boolean' })
    .notNull()
    .default(false),
  matchCharacterDepthPrompt: integer('match_character_depth_prompt', { mode: 'boolean' })
    .notNull()
    .default(false),
  matchScenario: integer('match_scenario', { mode: 'boolean' }).notNull().default(false),
  matchCreatorNotes: integer('match_creator_notes', { mode: 'boolean' }).notNull().default(false),
  ignoreBudget: integer('ignore_budget', { mode: 'boolean' }).notNull().default(false),
  extensions: text('extensions', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
}, (table) => [
  index('worldinfo_entries_file_id_idx').on(table.fileId),
  index('worldinfo_entries_uid_idx').on(table.uid),
  index('worldinfo_entries_file_id_uid_idx').on(table.fileId, table.uid),
]);

export const worldinfoEntryStates = sqliteTable('worldinfo_entry_states', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  chatId: text('chat_id').notNull(),
  entryUid: text('entry_uid').notNull(),
  entryFileId: integer('entry_file_id').references(() => worldinfoFiles.id, { onDelete: 'cascade' }),
  activatedAtMessageIndex: integer('activated_at_message_index').notNull().default(0),
  activationCount: integer('activation_count').notNull().default(0),
  consecutiveMatches: integer('consecutive_matches').notNull().default(0),
  lastDeactivatedAt: integer('last_deactivated_at').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  userId: text('user_id').notNull().default('default-user'),
}, (table) => [
  index('worldinfo_entry_states_chat_id_idx').on(table.chatId),
  index('worldinfo_entry_states_entry_uid_idx').on(table.entryUid),
  uniqueIndex('worldinfo_entry_states_chat_id_entry_uid_idx').on(table.chatId, table.entryUid),
]);

export const presets = sqliteTable('presets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  userId: text('user_id').notNull().default('default-user'),
}, (table) => [
  index('presets_user_id_idx').on(table.userId),
  index('presets_category_name_idx').on(table.category, table.name),
]);

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().default('default-user').unique(),
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: integer('updated_at').notNull(),
});

export const settingsSnapshots = sqliteTable('settings_snapshots', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  userId: text('user_id').notNull().default('default-user'),
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
  createdAt: integer('created_at').notNull(),
});

export const secrets = sqliteTable('secrets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull(),
  value: text('value').notNull(),
  label: text('label').notNull().default(''),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  userId: text('user_id').notNull().default('default-user'),
}, (table) => [
  index('secrets_user_id_idx').on(table.userId),
  index('secrets_key_idx').on(table.key),
]);

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  handle: text('handle').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('user'),
  avatar: text('avatar').default(''),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
});

export const stats = sqliteTable('stats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().default('default-user'),
  key: text('key').notNull(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('stats_user_id_idx').on(table.userId),
]);

export const themes = sqliteTable('themes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
  userId: text('user_id').notNull().default('default-user'),
}, (table) => [
  index('themes_user_id_idx').on(table.userId),
]);

export const imageMetadata = sqliteTable('image_metadata', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fileName: text('file_name').notNull().unique(),
  folder: text('folder').notNull(),
  width: integer('width'),
  height: integer('height'),
  size: integer('size'),
  mimeType: text('mime_type'),
  userId: text('user_id').notNull().default('default-user'),
}, (table) => [
  index('image_metadata_user_id_idx').on(table.userId),
]);

export const quickReplies = sqliteTable('quick_replies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
  userId: text('user_id').notNull().default('default-user'),
}, (table) => [
  index('quick_replies_user_id_idx').on(table.userId),
]);

export const movingUiState = sqliteTable('moving_ui_state', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().default('default-user').unique(),
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: integer('updated_at').notNull(),
});

export const files = sqliteTable('files', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fileName: text('file_name').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  folder: text('folder').notNull(),
  userId: text('user_id').notNull().default('default-user'),
  uploadedAt: integer('uploaded_at').notNull(),
}, (table) => [
  index('files_user_id_idx').on(table.userId),
]);

export const vectorStores = sqliteTable('vector_stores', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  vector: blob('vector', { mode: 'buffer' }).notNull(),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  userId: text('user_id').notNull().default('default-user'),
}, (table) => [
  index('vector_stores_user_id_idx').on(table.userId),
]);

export const connectionProfiles = sqliteTable('connection_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  data: text('data').notNull(), // JSON blob of profile settings
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const extensions = sqliteTable('extensions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  displayName: text('display_name').notNull().default(''),
  version: text('version').notNull().default(''),
  author: text('author').default(''),
  description: text('description').default(''),
  gitUrl: text('git_url'),
  branch: text('branch'),
  subfolder: text('subfolder'),
  scope: text('scope').notNull().default('user'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  settings: text('settings', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  manifestCache: text('manifest_cache', { mode: 'json' }).$type<unknown>(),
  hasUpdate: integer('has_update', { mode: 'boolean' }).notNull().default(false),
  installedAt: text('installed_at'),
  lastUpdatedAt: text('last_updated_at'),
  userId: text('user_id').notNull().default('default-user'),
}, (table) => [
  index('extensions_user_id_idx').on(table.userId),
]);
