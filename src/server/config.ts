import { SHARED_CONST } from "@/shared/constants"

export interface ServerConfig {
  port: number
  host: string
  apiPrefix: string
  sessionCookieName: string
  avatarWidth: number
  avatarHeight: number
  defaultAvatarPath: string
  env: string
}

export function loadConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT ?? 3000),
    host: process.env.HOST ?? "127.0.0.1",
    apiPrefix: SHARED_CONST.API_VERSION_PREFIX,
    sessionCookieName: SHARED_CONST.SESSION_COOKIE_NAME,
    avatarWidth: SHARED_CONST.AVATAR_WIDTH,
    avatarHeight: SHARED_CONST.AVATAR_HEIGHT,
    defaultAvatarPath: SHARED_CONST.DEFAULT_AVATAR_PATH,
    env: process.env.NODE_ENV ?? "development",
  }
}

export const config = loadConfig()
