import fs from 'node:fs';
import path from 'node:path';
import { SHARED_CONST } from '@/shared/constants';

export interface ServerConfig {
  port: number;
  host: string;
  apiPrefix: string;
  sessionCookieName: string;
  avatarWidth: number;
  avatarHeight: number;
  defaultAvatarPath: string;
  env: string;
}

export function loadConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT ?? 3000),
    host: process.env.HOST ?? '127.0.0.1',
    apiPrefix: SHARED_CONST.API_VERSION_PREFIX,
    sessionCookieName: SHARED_CONST.SESSION_COOKIE_NAME,
    avatarWidth: SHARED_CONST.AVATAR_WIDTH,
    avatarHeight: SHARED_CONST.AVATAR_HEIGHT,
    defaultAvatarPath: SHARED_CONST.DEFAULT_AVATAR_PATH,
    env: process.env.NODE_ENV ?? 'development',
  };
}

export const config = loadConfig();

// ── App Backend Configuration ────────────────────────────────────────────────

export type BackendType = 'sqlite' | 'mongodb' | 'jsonfiles';

export interface AppConfig {
  backend: BackendType;
  /** MongoDB connection URI — only when backend = 'mongodb'. */
  mongodbUri?: string;
  createdAt: number;
}

const DATA_ROOT = process.env.WORLDCORE_DATA_ROOT ?? path.resolve('data');
const CONFIG_PATH = path.join(DATA_ROOT, 'config.json');

/**
 * Check if the app has never been configured (no config.json on disk).
 * Called at startup to decide whether to show onboarding.
 */
export function isOnboardingNeeded(): boolean {
  return !fs.existsSync(CONFIG_PATH);
}

/**
 * Load the persisted app config. Returns null if no config exists.
 */
export function loadAppConfig(): AppConfig | null {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as AppConfig;
  } catch {
    return null;
  }
}

/**
 * Write the app config to disk. Called once during onboarding.
 */
export function saveAppConfig(cfg: AppConfig): void {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
}
