import { consumeLogin, consumeRegister } from "@/server/auth/rateLimit"

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  )
}

export function loginRateLimitMiddleware(
  handler: (req: Request, ctx: unknown) => Promise<Response>,
) {
  return async (req: Request, ctx?: unknown): Promise<Response> => {
    const ip = getClientIp(req)
    try {
      await consumeLogin(ip)
    } catch {
      return Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many login attempts" } },
        { status: 429 },
      )
    }
    return handler(req, ctx)
  }
}

export function registerRateLimitMiddleware(
  handler: (req: Request, ctx?: unknown) => Promise<Response>,
) {
  return async (req: Request, ctx?: unknown): Promise<Response> => {
    const ip = getClientIp(req)
    try {
      await consumeRegister(ip)
    } catch {
      return Response.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests" } },
        { status: 429 },
      )
    }
    return handler(req, ctx)
  }
}
