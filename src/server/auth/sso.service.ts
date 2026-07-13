import { randomBytes } from "node:crypto"
import { db } from "@/server/db/client"
import { users } from "@/server/db/schema"
import { eq } from "drizzle-orm"
import { settingsService } from "@/server/services/settings.service"
import { signSession, generateCsrfToken, type SessionPayload } from "@/server/auth/session"
import { SSOSettingsSchema, SSOCallbackRequestSchema } from "@/shared/schemas/sso"
import type { SSOProvider, SSOSettings } from "@/shared/types/sso"
import type { User } from "@/shared/types/user"
import forge from "node-forge"

const STATE_STORE = new Map<string, { provider: SSOProvider; expires: number }>()

const SSO_SETTINGS_KEY = "sso_settings"

let ssoSStore: Record<string, unknown> = {}
let ssoStoreLoaded = false

async function loadSSOStore(): Promise<Record<string, unknown>> {
  return settingsService.get()
}

async function ensureSSOStore(): Promise<void> {
  if (!ssoStoreLoaded) {
    ssoSStore = await loadSSOStore()
    ssoStoreLoaded = true
  }
}

export async function getSSOSettingsSafe(): Promise<SSOSettings> {
  await ensureSSOStore()
  const raw = ssoSStore[SSO_SETTINGS_KEY]
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    const result = SSOSettingsSchema.safeParse({})
    if (result.success) return result.data
    return {} as SSOSettings
  }
  const result = SSOSettingsSchema.safeParse(raw as Record<string, unknown>)
  if (result.success) return result.data
  return {} as SSOSettings
}

export async function saveSSOSettings(settings: Partial<SSOSettings>): Promise<void> {
  await ensureSSOStore()
  const current = ssoSStore[SSO_SETTINGS_KEY]
  const merged = {
    ...SSOSettingsSchema.parse({}),
    ...(typeof current === "object" && current && !Array.isArray(current)
      ? (current as Record<string, unknown>)
      : {}),
    ...settings,
  }
  ssoSStore[SSO_SETTINGS_KEY] = merged
  await settingsService.save(ssoSStore)
}

async function findOrCreateUser(
  username: string,
  email?: string,
  role?: "user" | "admin",
): Promise<User> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, username))
    .limit(1)

  if (existing.length > 0) {
    const row = existing[0]!
    return {
      id: row.id,
      username: row.handle,
      role: row.role as "admin" | "user" | "disabled",
    }
  }

  const userRole = role ?? "user"
  await db.insert(users).values({
    id: username,
    handle: email ?? username,
    name: username,
    role: userRole,
    enabled: true,
    createdAt: Date.now(),
  })

  return {
    id: username,
    username: username,
    role: userRole,
  }
}

function createSession(userId: string): { session: SessionPayload; cookie: string } {
  const session: SessionPayload = {
    userId,
    csrfToken: generateCsrfToken(),
  }
  return { session, cookie: signSession(session) }
}

function generateState(): string {
  return randomBytes(16).toString("hex")
}

function validateState(state: string): boolean {
  const entry = STATE_STORE.get(state)
  if (!entry) return false
  if (Date.now() > entry.expires) {
    STATE_STORE.delete(state)
    return false
  }
  STATE_STORE.delete(state)
  return true
}

/* ---------- Authelia ---------- */

export async function handleAutheliaAuth(req: Request): Promise<User | null> {
  const settings = await getSSOSettingsSafe()
  if (settings.provider !== "authelia" || !settings.enabled) return null

  const remoteUser = req.headers.get("Remote-User")
  const remoteEmail = req.headers.get("Remote-Email")
  const remoteName = req.headers.get("Remote-Name")

  if (!remoteUser) return null

  if (settings.autheliaUrl) {
    const valid = await verifyAutheliaToken(settings.autheliaUrl, remoteUser)
    if (!valid) return null
  }

  const role = "user"
  return findOrCreateUser(remoteUser, remoteEmail ?? undefined, role)
}

async function verifyAutheliaToken(_baseUrl: string, _username: string): Promise<boolean> {
  try {
    const resp = await fetch(`${_baseUrl}/api/verify`, {
      headers: { "Accept": "application/json" },
    })
    return resp.ok
  } catch {
    return true
  }
}

/* ---------- Authentik ---------- */

export function getAuthentikAuthUrl(settings: SSOSettings, redirectUrl: string): string {
  const state = generateState()
  STATE_STORE.set(state, { provider: "authentik", expires: Date.now() + 600_000 })

  const baseUrl = settings.authentikBaseUrl ?? ""
  const clientId = settings.authentikClientId ?? ""
  const callbackUrl = settings.authentikRedirectUrl ?? redirectUrl

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: callbackUrl,
    state,
    scope: "openid profile email",
  })

  return `${baseUrl}/application/o/authorize/?${params.toString()}`
}

export async function exchangeAuthentikCode(
  settings: SSOSettings,
  code: string,
  state: string,
): Promise<User | null> {
  if (!validateState(state)) return null

  const baseUrl = settings.authentikBaseUrl ?? ""
  const clientId = settings.authentikClientId ?? ""
  const clientSecret = settings.authentikClientSecret ?? ""
  const callbackUrl = settings.authentikRedirectUrl ?? ""

  const tokenResp = await fetch(`${baseUrl}/application/o/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!tokenResp.ok) return null

  const tokenData = (await tokenResp.json()) as Record<string, unknown>
  const idToken = tokenData.id_token as string | undefined
  if (!idToken) return null

  const userInfo = await decodeIdToken(idToken)
  if (!userInfo) return null

  const username = (userInfo.preferred_username ?? userInfo.email ?? userInfo.sub ?? "unknown") as string
  const email = userInfo.email as string | undefined
  return findOrCreateUser(username, email)
}

async function decodeIdToken(idToken: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = idToken.split(".")
    if (parts.length !== 3) return null

    const payload = forge.util.decode64(parts[1]!)
    return JSON.parse(payload) as Record<string, unknown>
  } catch {
    return null
  }
}

/* ---------- Basic Auth ---------- */

export async function verifyBasicAuth(
  authorization: string,
  settings: SSOSettings,
): Promise<User | null> {
  if (settings.provider !== "basicauth" || !settings.enabled) return null

  const parts = authorization.split(" ")
  if (parts.length !== 2 || parts[0] !== "Basic") return null

  const decoded = Buffer.from(parts[1]!, "base64").toString("utf-8")
  const colonIndex = decoded.indexOf(":")
  if (colonIndex < 0) return null

  const username = decoded.slice(0, colonIndex)
  const password = decoded.slice(colonIndex + 1)

  const configuredUsers = settings.basicAuthUsers ?? []
  const match = configuredUsers.find(
    (u) => u.username === username && u.password === password,
  )

  if (!match) return null

  return findOrCreateUser(username, undefined, match.role)
}

/* ---------- Session helpers ---------- */

export async function createSSOCallbackResponse(
  provider: SSOProvider,
  body: Record<string, unknown>,
): Promise<{ user: User; session: SessionPayload } | null> {
  const settings = await getSSOSettingsSafe()
  if (!settings.enabled) return null

  const parsed = SSOCallbackRequestSchema.safeParse(body)
  if (!parsed.success) return null

  const { code, state, id_token, authorization } = parsed.data

  if (provider === "authentik") {
    if (!code || !state) return null
    const user = await exchangeAuthentikCode(settings, code, state)
    if (!user) return null
    return { user, session: createSession(user.id).session }
  }

  if (provider === "basicauth") {
    if (!authorization) return null
    const user = await verifyBasicAuth(authorization, settings)
    if (!user) return null
    return { user, session: createSession(user.id).session }
  }

  if (provider === "authelia") {
    if (id_token) {
      const userInfo = await decodeIdToken(id_token)
      if (!userInfo) return null
      const username = (userInfo.preferred_username ?? userInfo.email ?? userInfo.sub ?? "unknown") as string
      const email = userInfo.email as string | undefined
      const user = await findOrCreateUser(username, email)
      return { user, session: createSession(user.id).session }
    }
  }

  return null
}
