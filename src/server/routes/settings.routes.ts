import { errorGuard } from "@/server/middleware/errorGuard"
import { settingsService } from "@/server/services/settings.service"

export const settingsRoutes = {
  save: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as Record<string, unknown>
    await settingsService.save(body)
    return Response.json({ ok: true })
  }),

  get: errorGuard(async (_req: Request): Promise<Response> => {
    const result = await settingsService.get()
    return Response.json(result)
  }),

  getSnapshots: errorGuard(async (_req: Request): Promise<Response> => {
    const snapshots = await settingsService.getSnapshots()
    return Response.json(snapshots)
  }),

  loadSnapshot: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { id: string }
    const data = await settingsService.loadSnapshot(body.id)
    return Response.json(data)
  }),

  makeSnapshot: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { name: string }
    const id = await settingsService.makeSnapshot(body.name)
    return Response.json({ ok: true, id })
  }),

  restoreSnapshot: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { id: string }
    await settingsService.restoreSnapshot(body.id)
    return Response.json({ ok: true })
  }),
}
