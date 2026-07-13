import { errorGuard } from "@/server/middleware/errorGuard"
import { assetService } from "@/server/services/asset.service"

export const filesRoutes = {
  upload: errorGuard(async (req: Request): Promise<Response> => {
    const formData = await req.formData()
    const result = await assetService.upload(formData, "files")
    return Response.json({ ok: true, fileName: result.fileName, mimeType: result.mimeType })
  }),

  list: errorGuard(async (_req: Request): Promise<Response> => {
    const result = await assetService.list("files")
    return Response.json(result)
  }),

  delete: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { fileName: string }
    await assetService.delete("files", body.fileName)
    return Response.json({ ok: true })
  }),
}
