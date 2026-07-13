import { randomBytes, createHmac } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { CACHE_ROOT } from "@/server/storage/paths"
import { SHARED_CONST } from "@/shared/constants"

const SECRET_FILE = path.join(CACHE_ROOT, "session-secret.txt")
const COOKIE_NAME = SHARED_CONST.SESSION_COOKIE_NAME
const MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000

export interface SessionPayload {
  userId: string
  csrfToken: string
  [key: string]: unknown
}

function ensureSessionSecret(): string {
  if (!fs.existsSync(CACHE_ROOT)) {
    fs.mkdirSync(CACHE_ROOT, { recursive: true })
  }
  if (fs.existsSync(SECRET_FILE)) {
    return fs.readFileSync(SECRET_FILE, "utf-8").trim()
  }
  const secret = randomBytes(32).toString("hex")
  fs.writeFileSync(SECRET_FILE, secret)
  return secret
}

const SESSION_SECRET = ensureSessionSecret()

export function signSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const hmac = createHmac("sha256", SESSION_SECRET)
  hmac.update(body)
  const sig = hmac.digest("hex")
  return `${body}.${sig}`
}

export function verifySession(cookie: string): SessionPayload | null {
  const parts = cookie.split(".")
  if (parts.length !== 2) return null
  const [body, expectedSig] = parts as [string, string]

  const hmac = createHmac("sha256", SESSION_SECRET)
  hmac.update(body)
  const computedSig = hmac.digest("hex")

  if (!timingSafeEqual(computedSig, expectedSig)) return null

  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as SessionPayload
  } catch {
    return null
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let c = 0
  for (let i = 0; i < a.length; i++) {
    c |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return c === 0
}

function parseCookie(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {}
  const cookies: Record<string, string> = {}
  for (const part of cookieHeader.split(";")) {
    const eqIndex = part.indexOf("=")
    if (eqIndex < 0) continue
    const name = part.slice(0, eqIndex).trim()
    const value = decodeURIComponent(part.slice(eqIndex + 1))
    if (name) {
      cookies[name] = value
    }
  }
  return cookies
}

export function getSession(req: Request): SessionPayload | null {
  const cookieHeader = req.headers.get("Cookie")
  const cookies = parseCookie(cookieHeader)
  const sessionCookie = cookies[COOKIE_NAME]
  if (!sessionCookie) return null
  return verifySession(sessionCookie)
}

export function setSessionCookie(res: Response, payload: SessionPayload): void {
  const signed = signSession(payload)
  res.headers.set("Set-Cookie",
    `${COOKIE_NAME}=${signed}; Max-Age=${Math.floor(MAX_AGE_MS / 1000)}; Path=/; HttpOnly; SameSite=Lax`,
  )
}

export function clearSessionCookie(res: Response): void {
  res.headers.set("Set-Cookie",
    `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`,
  )
}

export function generateCsrfToken(): string {
  return randomBytes(16).toString("hex")
}
