import { errorGuard } from '@/server/middleware/errorGuard';
import { withUserId } from '@/server/middleware/withUserId';
import { loadAppConfig, saveAppConfig, type AppConfig } from '@/server/config';

export const serverConfigRoutes = {
  get: errorGuard(
    withUserId(async (_req: Request, _userId: string): Promise<Response> => {
      const config = loadAppConfig();
      return Response.json({ host: config?.host ?? '127.0.0.1' });
    }),
  ),

  update: errorGuard(
    withUserId(async (req: Request, _userId: string): Promise<Response> => {
      const body = (await req.json()) as { host?: string };
      const host = body.host;

      if (host !== '127.0.0.1' && host !== '0.0.0.0') {
        return Response.json(
          { error: { code: 'INVALID_HOST', message: 'Host must be 127.0.0.1 or 0.0.0.0' } },
          { status: 400 },
        );
      }

      const existing = loadAppConfig();
      if (!existing) {
        return Response.json(
          { error: { code: 'NO_CONFIG', message: 'App not configured yet' } },
          { status: 400 },
        );
      }

      const updated: AppConfig = { ...existing, host };
      saveAppConfig(updated);

      return Response.json({ ok: true, host, message: 'Restart server to apply changes' });
    }),
  ),
};
