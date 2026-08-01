import { errorGuard } from '@/server/middleware/errorGuard';
import { securityHeaders } from '@/server/errors';

export const modelsRoutes = {
  list: errorGuard(async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const parts = url.pathname.split('/');
    const source = parts[parts.length - 1];

    if (!source) {
      return Response.json(
        { error: { code: 'BAD_REQUEST', message: 'Missing model source' } },
        { status: 400, headers: securityHeaders },
      );
    }

    const upstreamUrl = url.searchParams.get('url');

    let modelsUrl: string;
    if (source === 'ollama') {
      modelsUrl = `${upstreamUrl || 'http://127.0.0.1:11434'}/api/tags`;
    } else {
      const base = upstreamUrl || 'http://127.0.0.1:8080';
      modelsUrl = `${base}/v1/models`;
    }

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(modelsUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reach upstream';
      return Response.json(
        { error: { code: 'UPSTREAM_UNREACHABLE', message } },
        { status: 502, headers: securityHeaders },
      );
    }
    if (!upstreamRes.ok) {
      return Response.json(
        { error: { code: 'UPSTREAM_ERROR', message: `Upstream returned ${upstreamRes.status}` } },
        { status: 502, headers: securityHeaders },
      );
    }

    const data = (await upstreamRes.json()) as unknown;

    let models: Array<{ id: string; label: string; context_length?: number }> = [];

    if (source === 'ollama') {
      const modelList = (data as { models?: Array<{ name: string }> }).models ?? [];
      models = modelList.map((m) => ({ id: m.name, label: m.name }));
    } else {
      const modelList = (data as { data?: Array<{ id: string; name?: string }> }).data ?? [];
      models = modelList.map((m) => ({ id: m.id, label: m.name || m.id }));
    }

    const base = upstreamUrl || 'http://127.0.0.1:8080';
    try {
      const propsRes = await fetch(`${base}/props`);
      if (propsRes.ok) {
        const props = (await propsRes.json()) as Record<string, unknown>;
        const settings = props.default_generation_settings as Record<string, unknown> | undefined;
        const nCtx = (settings?.n_ctx as number) || (props.n_ctx as number);
        if (typeof nCtx === 'number' && nCtx > 0) {
          models = models.map((m) => ({ ...m, context_length: nCtx }));
        }
      }
    } catch {
      // /props not available on all backends
    }

    return Response.json(models, { headers: securityHeaders });
  }),

  context: errorGuard(async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const upstreamUrl = url.searchParams.get('url');
    const model = url.searchParams.get('model');

    if (!model) {
      return Response.json(
        { error: { code: 'BAD_REQUEST', message: 'Missing model parameter' } },
        { status: 400, headers: securityHeaders },
      );
    }

    const base = upstreamUrl || 'http://127.0.0.1:8080';

    try {
      const slotsRes = await fetch(`${base}/slots?model=${encodeURIComponent(model)}`);
      if (slotsRes.ok) {
        const slots = (await slotsRes.json()) as
          Array<Record<string, unknown>> | Record<string, unknown>;
        const first = Array.isArray(slots) ? slots[0] : slots;
        const nCtx = first?.n_ctx as number | undefined;
        if (typeof nCtx === 'number' && nCtx > 0) {
          return Response.json({ context_length: nCtx }, { headers: securityHeaders });
        }
      }
    } catch {
      // /slots not available
    }

    try {
      const propsRes = await fetch(`${base}/props`);
      if (propsRes.ok) {
        const props = (await propsRes.json()) as Record<string, unknown>;
        const settings = props.default_generation_settings as Record<string, unknown> | undefined;
        const nCtx = (settings?.n_ctx as number) || (props.n_ctx as number);
        if (typeof nCtx === 'number' && nCtx > 0) {
          return Response.json({ context_length: nCtx }, { headers: securityHeaders });
        }
      }
    } catch {
      // /props not available
    }

    return Response.json({ context_length: null }, { headers: securityHeaders });
  }),
};
