import { csrfRoutes } from './csrf.routes';
import { usersPublicRoutes } from './users.public.routes';
import { usersPrivateRoutes } from './users.private.routes';
import { usersAdminRoutes } from './users.admin.routes';
import { secretsRoutes } from './secrets.routes';
import { settingsRoutes } from './settings.routes';
import { characterRoutes } from './characters.routes';
import { chatsRoutes } from './chats.routes';
import { groupsRoutes } from './groups.routes';
import { worldinfoRoutes } from './worldinfo.routes';
import { presetsRoutes } from './presets.routes';
import { chatCompletionsRoutes } from './backends/chatcompletions.routes';
import { textCompletionsRoutes } from './backends/textcompletions.routes';
import { streamingRoutes } from './backends/streaming.routes';
import { tokenizersRoutes } from './tokenizers.routes';
import { translateRoutes } from './translate.routes';
import { searchRoutes } from './search.routes';
import { sdRoutes } from './sd.routes';
import { speechRoutes } from './speech.routes';
import { avatarsRoutes } from './avatars.routes';
import { backgroundsRoutes } from './backgrounds.routes';
import { spritesRoutes } from './sprites.routes';
import { thumbnailsRoutes } from './thumbnails.routes';
import { assetsRoutes } from './assets.routes';
import { filesRoutes } from './files.routes';
import { imageMetadataRoutes } from './imageMetadata.routes';
import { themesRoutes } from './themes.routes';
import { quickrepliesRoutes } from './quickreplies.routes';
import { movinguiRoutes } from './movingui.routes';
import { statsRoutes } from './stats.routes';
import { classifyRoutes } from './classify.routes';
import { captionRoutes } from './caption.routes';
import { backupsRoutes } from './backups.routes';
import { datamaidsRoutes } from './datamaids.routes';
import { contentRoutes } from './content.routes';
import { extensionsRoutes } from './extensions.routes';
import { connectionProfilesRoutes } from './connection-profiles.routes';
import { vectorsRoutes } from './vectors.routes';
import { ssoRoutes } from './sso.routes';
import { promptBuilderRoutes } from './prompt-builder.routes';
import { SHARED_CONST } from '@/shared/constants';

const PREFIX = SHARED_CONST.API_VERSION_PREFIX;

export type RouteHandler = (req: Request, ctx?: unknown) => Promise<Response>;

export function buildApiRoutes(): Record<string, RouteHandler> {
  const routes: Record<string, RouteHandler> = {};

  routes[`${PREFIX}/csrf-token`] = csrfRoutes.GET;

  // === SSO (T27) ===
  routes[`${PREFIX}/sso/login`] = ssoRoutes.login;
  routes[`${PREFIX}/sso/callback`] = ssoRoutes.callback;
  routes[`${PREFIX}/sso/logout`] = ssoRoutes.logout;
  routes[`${PREFIX}/sso/settings`] = ssoRoutes.settings;

  // === Users (T6) — Public ===
  routes[`${PREFIX}/users/list`] = usersPublicRoutes.list;
  routes[`${PREFIX}/users/login`] = usersPublicRoutes.login;
  routes[`${PREFIX}/users/recover-step1`] = usersPublicRoutes.recoverStep1;
  routes[`${PREFIX}/users/recover-step2`] = usersPublicRoutes.recoverStep2;
  routes[`${PREFIX}/users/logout`] = usersPublicRoutes.logout;

  // === Users (T6) — Private ===
  routes[`${PREFIX}/users/me`] = usersPrivateRoutes.me;
  routes[`${PREFIX}/users/change-avatar`] = usersPrivateRoutes.changeAvatar;
  routes[`${PREFIX}/users/change-password`] = usersPrivateRoutes.changePassword;
  routes[`${PREFIX}/users/backup`] = usersPrivateRoutes.backup;
  routes[`${PREFIX}/users/reset-settings`] = usersPrivateRoutes.resetSettings;
  routes[`${PREFIX}/users/change-name`] = usersPrivateRoutes.changeName;
  routes[`${PREFIX}/users/reset-step1`] = usersPrivateRoutes.resetStep1;
  routes[`${PREFIX}/users/reset-step2`] = usersPrivateRoutes.resetStep2;

  // === Users (T6) — Admin ===
  routes[`${PREFIX}/admin/users/get`] = usersAdminRoutes.get;
  routes[`${PREFIX}/admin/users/disable`] = usersAdminRoutes.disable;
  routes[`${PREFIX}/admin/users/enable`] = usersAdminRoutes.enable;
  routes[`${PREFIX}/admin/users/promote`] = usersAdminRoutes.promote;
  routes[`${PREFIX}/admin/users/demote`] = usersAdminRoutes.demote;
  routes[`${PREFIX}/admin/users/create`] = usersAdminRoutes.create;
  routes[`${PREFIX}/admin/users/delete`] = usersAdminRoutes.delete;
  routes[`${PREFIX}/admin/users/slugify`] = usersAdminRoutes.slugify;

  // === Secrets (T7) ===
  routes[`${PREFIX}/secrets/write`] = secretsRoutes.write;
  routes[`${PREFIX}/secrets/read`] = secretsRoutes.read;
  routes[`${PREFIX}/secrets/view`] = secretsRoutes.view;
  routes[`${PREFIX}/secrets/find`] = secretsRoutes.find;
  routes[`${PREFIX}/secrets/delete`] = secretsRoutes.delete;
  routes[`${PREFIX}/secrets/rotate`] = secretsRoutes.rotate;
  routes[`${PREFIX}/secrets/rename`] = secretsRoutes.rename;

  // === Characters (T8) ===
  routes[`${PREFIX}/characters/create`] = characterRoutes.create;
  routes[`${PREFIX}/characters/rename`] = characterRoutes.rename;
  routes[`${PREFIX}/characters/edit`] = characterRoutes.edit;
  routes[`${PREFIX}/characters/edit-avatar`] = characterRoutes.editAvatar;
  routes[`${PREFIX}/characters/edit-attribute`] = characterRoutes.editAttribute;
  routes[`${PREFIX}/characters/merge-attributes`] = characterRoutes.mergeAttributes;
  routes[`${PREFIX}/characters/delete`] = characterRoutes.delete;
  routes[`${PREFIX}/characters/all`] = characterRoutes.all;
  routes[`${PREFIX}/characters/get`] = characterRoutes.get;
  routes[`${PREFIX}/characters/chats`] = characterRoutes.chats;
  routes[`${PREFIX}/characters/duplicate`] = characterRoutes.duplicate;
  routes[`${PREFIX}/characters/import`] = characterRoutes.import;
  routes[`${PREFIX}/characters/export`] = characterRoutes.export;
  routes[`${PREFIX}/characters/avatar`] = characterRoutes.getAvatar;
  routes[`${PREFIX}/characters/thumbnail`] = characterRoutes.getThumbnail;
  routes[`${PREFIX}/characters/reconcile-list`] = characterRoutes.reconcileList;
  routes[`${PREFIX}/characters/reconcile-delete`] = characterRoutes.reconcileDelete;

  // === Prompt Builder ===
  routes[`${PREFIX}/prompt-builder/build`] = promptBuilderRoutes.build;

  // === Chats (T10) ===
  routes[`${PREFIX}/chats/save`] = chatsRoutes.save;
  routes[`${PREFIX}/chats/get`] = chatsRoutes.get;
  routes[`${PREFIX}/chats/rename`] = chatsRoutes.rename;
  routes[`${PREFIX}/chats/delete`] = chatsRoutes.delete;
  routes[`${PREFIX}/chats/export`] = chatsRoutes.export;
  routes[`${PREFIX}/chats/search`] = chatsRoutes.search;
  routes[`${PREFIX}/chats/recent`] = chatsRoutes.recent;
  routes[`${PREFIX}/chats/all`] = chatsRoutes.all;
  routes[`${PREFIX}/chats/message`] = chatsRoutes.message;
  routes[`${PREFIX}/chats/listByCharacter`] = chatsRoutes.listByCharacter;
  routes[`${PREFIX}/chats/groupMessage`] = chatsRoutes.groupMessage;
  routes[`${PREFIX}/chats/listGroupChats`] = chatsRoutes.listGroupChats;
  routes[`${PREFIX}/chats/import`] = chatsRoutes.import;
  routes[`${PREFIX}/chats/import-raw`] = chatsRoutes.importRaw;

  // === Groups (T12) ===
  routes[`${PREFIX}/groups/create`] = groupsRoutes.create;
  routes[`${PREFIX}/groups/get`] = groupsRoutes.get;
  routes[`${PREFIX}/groups/all`] = groupsRoutes.all;
  routes[`${PREFIX}/groups/update`] = groupsRoutes.update;
  routes[`${PREFIX}/groups/delete`] = groupsRoutes.delete;
  routes[`${PREFIX}/groups/add-member`] = groupsRoutes.addMember;
  routes[`${PREFIX}/groups/remove-member`] = groupsRoutes.removeMember;
  routes[`${PREFIX}/groups/import`] = groupsRoutes.import;
  routes[`${PREFIX}/groups/export`] = groupsRoutes.export;

  // === World Info (T13) ===
  routes[`${PREFIX}/worldinfo/create`] = worldinfoRoutes.create;
  routes[`${PREFIX}/worldinfo/get`] = worldinfoRoutes.get;
  routes[`${PREFIX}/worldinfo/all`] = worldinfoRoutes.all;
  routes[`${PREFIX}/worldinfo/update`] = worldinfoRoutes.update;
  routes[`${PREFIX}/worldinfo/delete`] = worldinfoRoutes.delete;
  routes[`${PREFIX}/worldinfo/add-entry`] = worldinfoRoutes.addEntry;
  routes[`${PREFIX}/worldinfo/update-entry`] = worldinfoRoutes.updateEntry;
  routes[`${PREFIX}/worldinfo/delete-entry`] = worldinfoRoutes.deleteEntry;
  routes[`${PREFIX}/worldinfo/import`] = worldinfoRoutes.import;
  routes[`${PREFIX}/worldinfo/export`] = worldinfoRoutes.export;

  // === Presets (T14) ===
  routes[`${PREFIX}/presets/get`] = presetsRoutes.get;
  routes[`${PREFIX}/presets/all`] = presetsRoutes.all;
  routes[`${PREFIX}/presets/save`] = presetsRoutes.save;
  routes[`${PREFIX}/presets/delete`] = presetsRoutes.delete;
  routes[`${PREFIX}/presets/import`] = presetsRoutes.import;
  routes[`${PREFIX}/presets/export`] = presetsRoutes.export;

  // === Settings (T7) ===
  routes[`${PREFIX}/settings/save`] = settingsRoutes.save;
  routes[`${PREFIX}/settings/get`] = settingsRoutes.get;
  routes[`${PREFIX}/settings/get-snapshots`] = settingsRoutes.getSnapshots;
  routes[`${PREFIX}/settings/load-snapshot`] = settingsRoutes.loadSnapshot;
  routes[`${PREFIX}/settings/make-snapshot`] = settingsRoutes.makeSnapshot;
  routes[`${PREFIX}/settings/restore-snapshot`] = settingsRoutes.restoreSnapshot;

  // === Tokenizers (T18) ===
  routes[`${PREFIX}/tokenizers/count`] = tokenizersRoutes.count;
  routes[`${PREFIX}/tokenizers/encode`] = tokenizersRoutes.encode;
  routes[`${PREFIX}/tokenizers/decode`] = tokenizersRoutes.decode;

  // === Translation (T19) ===
  routes[`${PREFIX}/translate`] = translateRoutes.POST;

  // === Search (T20) ===
  routes[`${PREFIX}/search`] = searchRoutes.POST;

  // === Image Generation (T22) ===
  routes[`${PREFIX}/sd/generate`] = sdRoutes.generate;

  // === Speech TTS/STT (T23) ===
  routes[`${PREFIX}/speech/synthesize`] = speechRoutes.synthesize;
  routes[`${PREFIX}/speech/transcribe`] = speechRoutes.transcribe;

  // === Backends (T15) ===
  routes[`${PREFIX}/ai/1.1/api/openai/chat/completions`] = chatCompletionsRoutes.generate;
  routes[`${PREFIX}/ai/1.1/api/openai/completions`] = textCompletionsRoutes.generate;

  // === Streaming (T17) ===
  routes[`${PREFIX}/ai/1.1/api/openai/chat/stream`] = streamingRoutes.chatStream;

  // === Vectors (T21) ===
  routes[`${PREFIX}/vectors/search`] = vectorsRoutes.search;
  routes[`${PREFIX}/vectors/embed`] = vectorsRoutes.embed;
  routes[`${PREFIX}/vectors/upsert`] = vectorsRoutes.upsert;
  routes[`${PREFIX}/vectors/delete`] = vectorsRoutes.delete;

  // === Assets (T24) ===
  routes[`${PREFIX}/avatars/upload`] = avatarsRoutes.upload;
  routes[`${PREFIX}/avatars/list`] = avatarsRoutes.list;
  routes[`${PREFIX}/avatars/delete`] = avatarsRoutes.delete;

  routes[`${PREFIX}/backgrounds/upload`] = backgroundsRoutes.upload;
  routes[`${PREFIX}/backgrounds/list`] = backgroundsRoutes.list;
  routes[`${PREFIX}/backgrounds/delete`] = backgroundsRoutes.delete;

  routes[`${PREFIX}/sprites/upload`] = spritesRoutes.upload;
  routes[`${PREFIX}/sprites/list`] = spritesRoutes.list;
  routes[`${PREFIX}/sprites/delete`] = spritesRoutes.delete;

  routes[`${PREFIX}/thumbnails/generate`] = thumbnailsRoutes.generate;

  routes[`${PREFIX}/assets/upload`] = assetsRoutes.upload;
  routes[`${PREFIX}/assets/list`] = assetsRoutes.list;
  routes[`${PREFIX}/assets/delete`] = assetsRoutes.delete;

  routes[`${PREFIX}/files/upload`] = filesRoutes.upload;
  routes[`${PREFIX}/files/list`] = filesRoutes.list;
  routes[`${PREFIX}/files/delete`] = filesRoutes.delete;

  routes[`${PREFIX}/imageMetadata/get`] = imageMetadataRoutes.get;

  // === Misc (T25) ===
  routes[`${PREFIX}/themes/get`] = themesRoutes.get;
  routes[`${PREFIX}/themes/save`] = themesRoutes.save;
  routes[`${PREFIX}/themes/all`] = themesRoutes.all;
  routes[`${PREFIX}/themes/delete`] = themesRoutes.delete;

  routes[`${PREFIX}/quickreplies/get`] = quickrepliesRoutes.get;
  routes[`${PREFIX}/quickreplies/save`] = quickrepliesRoutes.save;
  routes[`${PREFIX}/quickreplies/all`] = quickrepliesRoutes.all;
  routes[`${PREFIX}/quickreplies/delete`] = quickrepliesRoutes.delete;

  routes[`${PREFIX}/movingui/get`] = movinguiRoutes.get;
  routes[`${PREFIX}/movingui/save`] = movinguiRoutes.save;

  routes[`${PREFIX}/stats/get`] = statsRoutes.get;
  routes[`${PREFIX}/stats/save`] = statsRoutes.save;

  routes[`${PREFIX}/classify`] = classifyRoutes.classify;
  routes[`${PREFIX}/caption`] = captionRoutes.caption;

  routes[`${PREFIX}/backups/create`] = backupsRoutes.create;
  routes[`${PREFIX}/backups/restore`] = backupsRoutes.restore;

  routes[`${PREFIX}/datamaids`] = datamaidsRoutes.handle;
  routes[`${PREFIX}/content`] = contentRoutes.handle;

  routes[`${PREFIX}/extensions/list`] = extensionsRoutes.list;
  routes[`${PREFIX}/extensions/enable`] = extensionsRoutes.enable;
  routes[`${PREFIX}/extensions/disable`] = extensionsRoutes.disable;
  routes[`${PREFIX}/extensions/install`] = extensionsRoutes.install;
  routes[`${PREFIX}/extensions/uninstall`] = extensionsRoutes.uninstall;
  routes[`${PREFIX}/extensions/update`] = extensionsRoutes.update;
  routes[`${PREFIX}/extensions/updateAll`] = extensionsRoutes.updateAll;

  // === Connection Profiles ===
  routes[`${PREFIX}/connection-profiles/create`] = connectionProfilesRoutes.create;
  routes[`${PREFIX}/connection-profiles/all`] = connectionProfilesRoutes.all;
  routes[`${PREFIX}/connection-profiles/get`] = connectionProfilesRoutes.get;
  routes[`${PREFIX}/connection-profiles/update`] = connectionProfilesRoutes.update;
  routes[`${PREFIX}/connection-profiles/delete`] = connectionProfilesRoutes.delete;

  return routes;
}

export function listRoutes(): string[] {
  return Object.keys(buildApiRoutes());
}
