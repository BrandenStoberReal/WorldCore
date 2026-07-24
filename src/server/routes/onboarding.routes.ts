import { isOnboardingNeeded, saveAppConfig, type AppConfig } from '@/server/config';
import { errorGuard } from '@/server/middleware/errorGuard';
import { securityHeaders } from '@/server/errors';
import { personaService } from '@/server/services/persona.service';
import { DEFAULT_USER } from '@/server/auth/users';

let startFn: (() => Promise<void>) | null = null;

export function setStartFn(fn: () => Promise<void>): void {
  startFn = fn;
}

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

    const personaName = typeof body.personaName === 'string' ? body.personaName.trim() : '';
    if (!personaName) {
      return Response.json(
        { error: { code: 'BAD_REQUEST', message: 'Persona name is required' } },
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

    const personaDescription =
      typeof body.personaDescription === 'string' ? body.personaDescription.trim() : '';

    await personaService.create(
      {
        name: personaName,
        description: personaDescription,
        personality: '',
        scenario: '',
        systemPrompt: '',
        avatar: '',
        isDefault: true,
      },
      DEFAULT_USER.id,
    );

    if (startFn) await startFn();

    return Response.json({ ok: true }, { headers: securityHeaders });
  }),
};
