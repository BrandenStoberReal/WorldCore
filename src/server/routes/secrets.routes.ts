import { z } from 'zod';
import { errorGuard } from '@/server/middleware/errorGuard';
import { secretManager } from '@/server/services/secrets.service';
import type { SecretKey } from '@/shared/types/secret';

const SecretKeyBodySchema = z.object({
  key: z.string().min(1),
});

const WriteBodySchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  label: z.string().optional(),
});

const RotateBodySchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

const RenameBodySchema = z.object({
  key: z.string().min(1),
  label: z.string(),
});

const ViewBodySchema = z.object({
  key: z.string().min(1).optional(),
});

function validationError(message: string): Response {
  return Response.json({ error: { code: 'VALIDATION_ERROR', message } }, { status: 400 });
}

export const secretsRoutes = {
  write: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json();
    const result = WriteBodySchema.safeParse(body);
    if (!result.success) return validationError(result.error.message);
    const { key, value, label } = result.data;
    const res = await secretManager.write(key as SecretKey, value, label);
    return Response.json({ ok: true, id: res.id });
  }),

  read: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json();
    const result = SecretKeyBodySchema.safeParse(body);
    if (!result.success) return validationError(result.error.message);
    const { key } = result.data;
    const res = await secretManager.read(key as SecretKey);
    return Response.json(res || null);
  }),

  view: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json().catch(() => ({}));
    const result = ViewBodySchema.safeParse(body);
    if (!result.success) return validationError(result.error.message);
    if (result.data.key) {
      const res = await secretManager.find(result.data.key as SecretKey);
      return Response.json(res || null);
    }
    const all = await secretManager.findAll();
    return Response.json(all);
  }),

  find: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json().catch(() => ({}));
    const result = SecretKeyBodySchema.partial().safeParse(body);
    if (!result.success) return validationError(result.error.message);
    const key = result.data.key;
    if (!key) {
      const all = await secretManager.findAll();
      return Response.json(all);
    }
    const res = await secretManager.find(key as SecretKey);
    return Response.json(res || null);
  }),

  delete: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json();
    const result = SecretKeyBodySchema.safeParse(body);
    if (!result.success) return validationError(result.error.message);
    const { key } = result.data;
    const res = await secretManager.delete(key as SecretKey);
    return Response.json({ ok: res });
  }),

  rotate: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json();
    const result = RotateBodySchema.safeParse(body);
    if (!result.success) return validationError(result.error.message);
    const { key, value } = result.data;
    const res = await secretManager.rotate(key as SecretKey, value);
    return Response.json({ ok: true, id: res.id });
  }),

  rename: errorGuard(async (req: Request): Promise<Response> => {
    const body = await req.json();
    const result = RenameBodySchema.safeParse(body);
    if (!result.success) return validationError(result.error.message);
    const { key, label } = result.data;
    const res = await secretManager.rename(key as SecretKey, label);
    return Response.json({ ok: res });
  }),
};
