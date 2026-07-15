import { errorGuard } from '@/server/middleware/errorGuard';
import { assetService } from '@/server/services/asset.service';
import type { AssetCategory } from '@/server/services/asset.service';

export const thumbnailsRoutes = {
  generate: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as {
      fileName: string;
      category: AssetCategory;
      width?: number;
    };
    const thumbName = await assetService.generateThumbnailFor(
      body.fileName,
      body.category,
      body.width,
    );
    return Response.json({ ok: true, thumbnailName: thumbName });
  }),
};
