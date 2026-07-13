import { errorGuard } from "@/server/middleware/errorGuard"
import { assetService } from "@/server/services/asset.service"

export const imageMetadataRoutes = {
  get: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { filePath: string }
    const result = await assetService.getImageMetadata(body.filePath)
    return Response.json(result)
  }),
}
