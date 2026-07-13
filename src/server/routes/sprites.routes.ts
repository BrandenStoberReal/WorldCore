import { errorGuard } from "@/server/middleware/errorGuard"
import { assetService } from "@/server/services/asset.service"

export const spritesRoutes = {
  upload: errorGuard(async (req: Request): Promise<Response> => {
    const formData = await req.formData()
    const result = await assetService.upload(formData, "sprites")
    return Response.json({ ok: true, fileName: result.fileName, mimeType: result.mimeType })
  }),

  list: errorGuard(async (_req: Request): Promise<Response> => {
    const result = await assetService.list("sprites")
    return Response.json(result)
  }),

  delete: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { fileName: string }
    await assetService.delete("sprites", body.fileName)
    return Response.json({ ok: true })
  }),
}
