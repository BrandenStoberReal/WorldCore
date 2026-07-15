import { z } from 'zod';
import { SHARED_CONST } from '@/shared/constants';

export const SecretKeySchema = z.enum([...SHARED_CONST.SECRET_KEYS] as [string, ...string[]]);

export const SecretValueSchema = z.object({
  id: SecretKeySchema,
  value: z.string(),
  label: z.string().optional(),
  active: z.boolean().default(true),
});

export const SecretStateSchema = z.object({
  id: SecretKeySchema,
  value: z.string(),
  label: z.string().optional(),
  active: z.boolean().default(true),
});

export const SecretStateMapSchema = z.record(SecretKeySchema, SecretStateSchema);

export const EXPORTABLE_KEYS = SHARED_CONST.EXPORTABLE_SECRET_KEYS;
