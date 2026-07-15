import { errorGuard } from '@/server/middleware/errorGuard';
import { extensionsService } from '@/server/services/extensions.service';
import { InstallExtensionSchema, NameExtensionSchema } from '@/shared/schemas/extensions';
import { ValidationError, NotFoundError } from '@/server/errors';
import type { ExtensionInfo } from '@/shared/types/extensions';

export const extensionsRoutes = {
  list: errorGuard(async (_req: Request): Promise<Response> => {
    const extensions = await extensionsService.listExtensions();
    return Response.json(extensions);
  }),

  enable: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json();
    const parsed = NameExtensionSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten());
    }
    try {
      await extensionsService.enableExtension(parsed.data.name);
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      throw err;
    }
    return Response.json({ ok: true });
  }),

  disable: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json();
    const parsed = NameExtensionSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten());
    }
    try {
      await extensionsService.disableExtension(parsed.data.name);
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      throw err;
    }
    return Response.json({ ok: true });
  }),

  install: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json();
    const parsed = InstallExtensionSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten());
    }
    const result = await extensionsService.installExtension(parsed.data.url, parsed.data.targetDir);
    return Response.json({ ok: true, extension: result });
  }),

  uninstall: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json();
    const parsed = NameExtensionSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten());
    }
    try {
      await extensionsService.uninstallExtension(parsed.data.name);
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      throw err;
    }
    return Response.json({ ok: true });
  }),

  update: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json();
    const parsed = NameExtensionSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.flatten());
    }
    try {
      const result = await extensionsService.updateExtension(parsed.data.name);
      return Response.json({ ok: true, extension: result });
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      throw err;
    }
  }),

  updateAll: errorGuard(async (_req: Request): Promise<Response> => {
    const results = await extensionsService.updateAllExtensions();
    return Response.json({ ok: true, extensions: results });
  }),
};
