import path from "node:path"
import fs from "node:fs"

export const DATA_ROOT = path.resolve("data")
export const USER_ROOT = path.join(DATA_ROOT, "default-user")

export const paths = {
  characters: path.join(USER_ROOT, "characters"),
  chats: path.join(USER_ROOT, "chats"),
  groupChats: path.join(USER_ROOT, "groupChats"),
  groups: path.join(USER_ROOT, "groups"),
  worlds: path.join(USER_ROOT, "worlds"),
  openAISettings: path.join(USER_ROOT, "openAI_Settings"),
  koboldAISettings: path.join(USER_ROOT, "koboldAI_Settings"),
  textGenSettings: path.join(USER_ROOT, "textGen_Settings"),
  novelAISettings: path.join(USER_ROOT, "novelAI_Settings"),
  instruct: path.join(USER_ROOT, "instruct"),
  context: path.join(USER_ROOT, "context"),
  sysprompt: path.join(USER_ROOT, "sysprompt"),
  reasoning: path.join(USER_ROOT, "reasoning"),
  themes: path.join(USER_ROOT, "themes"),
  backgrounds: path.join(USER_ROOT, "backgrounds"),
  avatars: path.join(USER_ROOT, "avatars"),
  userImages: path.join(USER_ROOT, "userImages"),
  sprites: path.join(USER_ROOT, "sprites"),
  assets: path.join(USER_ROOT, "assets"),
  files: path.join(USER_ROOT, "files"),
  vectors: path.join(USER_ROOT, "vectors"),
  comfyWorkflows: path.join(USER_ROOT, "comfyWorkflows"),
  quickreplies: path.join(USER_ROOT, "quickreplies"),
  movingUI: path.join(USER_ROOT, "movingUI"),
  extensions: path.join(USER_ROOT, "extensions"),
  thirdParty: path.join(USER_ROOT, "third-party"),
  backups: path.join(USER_ROOT, "backups"),
} as const

export const CACHE_ROOT = path.join(DATA_ROOT, "_cache")
export const cachePaths = {
  tokenizers: path.join(CACHE_ROOT, "tokenizers"),
  extensions: path.join(CACHE_ROOT, "extensions"),
} as const

export function ensureUserDirs(): void {
  for (const dir of Object.values(paths)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.mkdirSync(CACHE_ROOT, { recursive: true })
  for (const dir of Object.values(cachePaths)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function getUserPath(userId: string): string {
  return path.join(DATA_ROOT, userId)
}
