import { errorGuard } from "@/server/middleware/errorGuard"
import { loginRateLimitMiddleware } from "@/server/middleware/rateLimit"
import { hashPassword, verifyPassword } from "@/server/auth/password"
import { getSession, setSessionCookie, generateCsrfToken, clearSessionCookie } from "@/server/auth/session"
import { DEFAULT_USER } from "@/server/auth/users"
import { eq } from "drizzle-orm"
import { db } from "@/server/db/client"
import { users } from "@/server/db/schema"

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  )
}

export const usersPublicRoutes = {
  list: errorGuard(async (_req: Request): Promise<Response> => {
    return Response.json([DEFAULT_USER.username])
  }),

  login: loginRateLimitMiddleware(errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json() as { handle?: string; password?: string }

    const handle = body.handle || "default-user"

    const dbUser = await db.select().from(users).where(eq(users.id, handle)).limit(1)

    const row = dbUser[0]
    let authenticated = false
    if (row && row.passwordHash) {
      authenticated = await verifyPassword(body.password || "", row.passwordHash)
    }

    if (!authenticated) {
      return Response.json(
        { error: { code: "AUTH_FAILED", message: "Invalid credentials" } },
        { status: 401 },
      )
    }

    const csrfToken = generateCsrfToken()
    const session = {
      userId: handle,
      csrfToken,
    }
    const res = Response.json({
      handle: DEFAULT_USER.username,
      name: DEFAULT_USER.username,
      admin: DEFAULT_USER.role === "admin",
      token: csrfToken,
    })
    setSessionCookie(res, session)
    return res
  })),

  recoverStep1: errorGuard(async (_req: Request): Promise<Response> => {
    return Response.json({ ok: true })
  }),

  recoverStep2: errorGuard(async (_req: Request): Promise<Response> => {
    return Response.json({ ok: true })
  }),

  logout: errorGuard(async (_req: Request): Promise<Response> => {
    const res = Response.json({ ok: true })
    clearSessionCookie(res)
    return res
  }),
}
