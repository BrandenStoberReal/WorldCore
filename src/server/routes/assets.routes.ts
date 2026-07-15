import { errorGuard } from '@/server/middleware/errorGuard';
import { assetService } from '@/server/services/asset.service';

export const assetsRoutes = {
  upload: errorGuard(async (req: Request): Promise<Response> => {
    const formData = await req.formData();
    const result = await assetService.upload(formData, 'assets');
    return Response.json({ ok: true, fileName: result.fileName, mimeType: result.mimeType });
  }),

  list: errorGuard(async (_req: Request): Promise<Response> => {
    const result = await assetService.list('assets');
    return Response.json(result);
  }),

  delete: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { fileName: string };
    await assetService.delete('assets', body.fileName);
    return Response.json({ ok: true });
  }),
};
