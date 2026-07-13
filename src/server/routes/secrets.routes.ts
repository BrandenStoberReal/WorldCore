import { errorGuard } from "@/server/middleware/errorGuard"
import { secretManager } from "@/server/services/secrets.service"
import type { SecretKey } from "@/shared/types/secret"

export const secretsRoutes = {
  write: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { key: string; value: string; label?: string }
    const result = await secretManager.write(
      body.key as SecretKey,
      body.value,
      body.label,
    )
    return Response.json({ ok: true, id: result.id })
  }),

  read: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { key: string }
    const result = await secretManager.read(body.key as SecretKey)
    return Response.json(result || null)
  }),

  view: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json().catch(() => ({}))) as { key?: string }
    if (body.key) {
      const result = await secretManager.find(body.key as SecretKey)
      return Response.json(result || null)
    }
    const all = await secretManager.findAll()
    return Response.json(all)
  }),

  find: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json().catch(() => ({}))) as { key: string }
    const result = await secretManager.find(body.key as SecretKey)
    return Response.json(result || null)
  }),

  delete: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { key: string }
    const result = await secretManager.delete(body.key as SecretKey)
    return Response.json({ ok: result })
  }),

  rotate: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { key: string; value: string }
    const result = await secretManager.rotate(body.key as SecretKey, body.value)
    return Response.json({ ok: true, id: result.id })
  }),

  rename: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { key: string; label: string }
    const result = await secretManager.rename(body.key as SecretKey, body.label)
    return Response.json({ ok: result })
  }),
}
