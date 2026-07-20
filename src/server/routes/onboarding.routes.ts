import { isOnboardingNeeded, saveAppConfig, type AppConfig } from '@/server/config';
import { errorGuard } from '@/server/middleware/errorGuard';
import { securityHeaders } from '@/server/errors';

export const onboardingRoutes = {
  status: errorGuard(async (): Promise<Response> => {
    const needed = isOnboardingNeeded();
    return Response.json({ onboarding: needed }, { headers: securityHeaders });
  }),

  complete: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as Record<string, unknown>;

    const backend = body.backend;
    if (backend !== 'sqlite' && backend !== 'mongodb' && backend !== 'jsonfiles') {
      return Response.json(
        { error: { code: 'BAD_REQUEST', message: 'Invalid backend type' } },
        { status: 400, headers: securityHeaders },
      );
    }

    const cfg: AppConfig = {
      backend,
      createdAt: Date.now(),
    };

    if (backend === 'mongodb') {
      const uri = typeof body.mongodbUri === 'string' ? body.mongodbUri : '';
      if (!uri) {
        return Response.json(
          { error: { code: 'BAD_REQUEST', message: 'MongoDB URI is required' } },
          { status: 400, headers: securityHeaders },
        );
      }
      cfg.mongodbUri = uri;
    }

    saveAppConfig(cfg);
    return Response.json({ ok: true }, { headers: securityHeaders });
  }),
};
