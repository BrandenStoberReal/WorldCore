import { getSession, setSessionCookie, generateCsrfToken } from "@/server/auth/session"
import { errorGuard } from "@/server/middleware/errorGuard"

export const csrfRoutes = {
  GET: errorGuard(async (req: Request): Promise<Response> => {
    let session = getSession(req)
    if (!session) {
      session = {
        userId: "default-user",
        csrfToken: generateCsrfToken(),
      }
    }
    if (!session.csrfToken) {
      session.csrfToken = generateCsrfToken()
    }
    const res = Response.json({ token: session.csrfToken })
    setSessionCookie(res, session)
    return res
  }),
}
