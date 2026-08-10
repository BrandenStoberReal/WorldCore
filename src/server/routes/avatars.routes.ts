import { errorGuard } from '@/server/middleware/errorGuard';
import { withUserId } from '@/server/middleware/withUserId';
import { assetService } from '@/server/services/asset.service';

export const avatarsRoutes = {
  upload: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const formData = await req.formData();
      const result = await assetService.upload(formData, 'avatars');
      return Response.json({ ok: true, fileName: result.fileName, mimeType: result.mimeType });
    }),
  ),

  list: errorGuard(
    withUserId(async (_req: Request, userId: string): Promise<Response> => {
      const result = await assetService.list('avatars');
      return Response.json(result);
    }),
  ),

  delete: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { fileName: string };
      await assetService.delete('avatars', body.fileName);
      return Response.json({ ok: true });
    }),
  ),
};
