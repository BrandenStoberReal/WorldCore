import { errorGuard } from "@/server/middleware/errorGuard"

export const captionRoutes = {
  caption: errorGuard(async (_req: Request): Promise<Response> => {
    return Response.json({ ok: true, caption: null })
  }),
}
