import { ApiError } from "@/server/errors"

export type GuardedHandler = (req: Request, ctx?: unknown) => Promise<Response>

export function errorGuard(handler: GuardedHandler): GuardedHandler {
  return async (req: Request, _ctx?: unknown): Promise<Response> => {
    try {
      return await handler(req, _ctx)
    } catch (err) {
      if (err instanceof ApiError) {
        return err.toResponse()
      }
      console.error("Unhandled error:", err)
      return Response.json(
        { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
        { status: 500 },
      )
    }
  }
}
