import path from 'node:path';
import fs from 'node:fs';
import { ValidationError } from '../errors';

export const DATA_ROOT = process.env.WORLDCORE_DATA_ROOT ?? path.resolve('data');
export const USER_ROOT = path.join(DATA_ROOT, 'default-user');

export const paths = {
  characters: path.join(USER_ROOT, 'characters'),
  chats: path.join(USER_ROOT, 'chats'),
  groupChats: path.join(USER_ROOT, 'groupChats'),
  groups: path.join(USER_ROOT, 'groups'),
  worlds: path.join(USER_ROOT, 'worlds'),
  openAISettings: path.join(USER_ROOT, 'openAI_Settings'),
  koboldAISettings: path.join(USER_ROOT, 'koboldAI_Settings'),
  textGenSettings: path.join(USER_ROOT, 'textGen_Settings'),
  novelAISettings: path.join(USER_ROOT, 'novelAI_Settings'),
  instruct: path.join(USER_ROOT, 'instruct'),
  context: path.join(USER_ROOT, 'context'),
  sysprompt: path.join(USER_ROOT, 'sysprompt'),
  reasoning: path.join(USER_ROOT, 'reasoning'),
  generation: path.join(USER_ROOT, 'generation'),
  themes: path.join(USER_ROOT, 'themes'),
  backgrounds: path.join(USER_ROOT, 'backgrounds'),
  avatars: path.join(USER_ROOT, 'avatars'),
  userImages: path.join(USER_ROOT, 'userImages'),
  sprites: path.join(USER_ROOT, 'sprites'),
  assets: path.join(USER_ROOT, 'assets'),
  files: path.join(USER_ROOT, 'files'),
  vectors: path.join(USER_ROOT, 'vectors'),
  comfyWorkflows: path.join(USER_ROOT, 'comfyWorkflows'),
  quickreplies: path.join(USER_ROOT, 'quickreplies'),
  movingUI: path.join(USER_ROOT, 'movingUI'),
  extensions: path.join(USER_ROOT, 'extensions'),
  thirdParty: path.join(USER_ROOT, 'third-party'),
  backups: path.join(USER_ROOT, 'backups'),
} as const;

export const CACHE_ROOT = path.join(DATA_ROOT, '_cache');
export const cachePaths = {
  tokenizers: path.join(CACHE_ROOT, 'tokenizers'),
  extensions: path.join(CACHE_ROOT, 'extensions'),
} as const;

export function ensureUserDirs(): void {
  for (const dir of Object.values(paths)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.mkdirSync(CACHE_ROOT, { recursive: true });
  for (const dir of Object.values(cachePaths)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function ensureGlobalExtensionRoot(): void {
  fs.mkdirSync(getGlobalExtensionRoot(), { recursive: true });
}

export function getUserPath(userId: string): string {
  return path.join(DATA_ROOT, userId);
}

export function getUserCharacterPath(userId: string): string {
  return path.join(DATA_ROOT, userId, 'characters');
}

export function getUserChatPath(userId: string): string {
  return path.join(DATA_ROOT, userId, 'chats');
}

export function getUserGroupChatPath(userId: string): string {
  return path.join(DATA_ROOT, userId, 'groupChats');
}

export function ensureUserCharacterDir(userId: string): void {
  fs.mkdirSync(getUserCharacterPath(userId), { recursive: true });
}

export function ensureUserChatDirs(userId: string): void {
  fs.mkdirSync(getUserChatPath(userId), { recursive: true });
  fs.mkdirSync(getUserGroupChatPath(userId), { recursive: true });
}

function sanitizeSlug(slug: string): string {
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new ValidationError({ message: 'invalid slug' });
  }
  return slug;
}

export function getGlobalExtensionRoot(): string {
  return path.join(DATA_ROOT, 'extensions');
}

export function getGlobalExtensionPath(extId: string): string {
  return path.join(getGlobalExtensionRoot(), sanitizeSlug(extId));
}

export function getUserExtensionRoot(userId: string): string {
  return path.join(DATA_ROOT, userId, 'extensions');
}

export function getUserExtensionPath(userId: string, extId: string): string {
  return path.join(getUserExtensionRoot(userId), sanitizeSlug(extId));
}

export function ensureUserExtensionDir(userId: string): void {
  fs.mkdirSync(getUserExtensionRoot(userId), { recursive: true });
}

export function safeExtensionPath(root: string, relPath: string): string {
  const resolved = path.resolve(root, relPath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new ValidationError({ message: 'path traversal detected' });
  }
  // Defense in depth against symlink-based traversal. `path.resolve` is purely
  // lexical on POSIX — a symlinked entry inside the extension dir would pass
  // the prefix check above while `Bun.file(...).stream()` follows the link at
  // read time, reading the link target outside the extension root.
  //
  // Only enforce the realpath guard when both endpoints exist on disk; missing
  // files (ENOENT) are intentional 404s handled by the caller via Bun.file.exists().
  let realRoot: string;
  try {
    realRoot = fs.realpathSync(root);
  } catch {
    return resolved;
  }
  try {
    const realResolved = fs.realpathSync(resolved);
    if (realResolved !== realRoot && !realResolved.startsWith(realRoot + path.sep)) {
      throw new ValidationError({ message: 'symlink path traversal detected' });
    }
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    // ENOENT for the resolved file — caller's Bun.file(...).exists() will 404.
  }
  return resolved;
}
