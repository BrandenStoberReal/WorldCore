import { errorGuard } from '@/server/middleware/errorGuard';
import { withUserId } from '@/server/middleware/withUserId';
import { presetService } from '@/server/services/preset.service';
import { NotFoundError } from '@/server/errors';
import type { Preset, PresetCategory } from '@/shared/types/preset';

export const presetsRoutes = {
  get: errorGuard(
    withUserId(async (req: Request, _userId: string): Promise<Response> => {
      const body = (await req.json().catch(() => ({}))) as {
        category: PresetCategory;
        name: string;
      };
      const preset = await presetService.get(body.category, body.name);
      if (!preset) {
        throw new NotFoundError(`Preset "${body.name}" in category "${body.category}"`);
      }
      return Response.json(preset);
    }),
  ),

  all: errorGuard(
    withUserId(async (req: Request, _userId: string): Promise<Response> => {
      const body = (await req.json().catch(() => ({}))) as { category?: PresetCategory };
      const results = await presetService.getAll(body.category);
      return Response.json(results);
    }),
  ),

  save: errorGuard(
    withUserId(async (req: Request, _userId: string): Promise<Response> => {
      const body = (await req.json()) as { preset: Preset };
      await presetService.save(body.preset);
      return Response.json({ ok: true });
    }),
  ),

  delete: errorGuard(
    withUserId(async (req: Request, _userId: string): Promise<Response> => {
      const body = (await req.json()) as { category: PresetCategory; name: string };
      await presetService.delete(body.category, body.name);
      return Response.json({ ok: true });
    }),
  ),

  import: errorGuard(
    withUserId(async (req: Request, _userId: string): Promise<Response> => {
      const body = (await req.json()) as { preset: Preset };
      await presetService.importPreset(body.preset);
      return Response.json({ ok: true });
    }),
  ),

  export: errorGuard(
    withUserId(async (req: Request, _userId: string): Promise<Response> => {
      const body = (await req.json()) as { category: PresetCategory; name: string };
      const result = await presetService.exportPreset(body.category, body.name);
      if (!result) {
        throw new NotFoundError(`Preset "${body.name}" in category "${body.category}"`);
      }
      return new Response(result.data as unknown as Blob, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${result.fileName}"`,
        },
      });
    }),
  ),
};
