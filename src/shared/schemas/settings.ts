import { z } from 'zod';
import { TextOptionsSchema } from './text-options';

export const SettingsObjectSchema = z.record(z.unknown());

export const TypedSettingsSchema = z.object({
  textOptions: TextOptionsSchema.optional(),
});

export const SettingsSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  data: SettingsObjectSchema,
  created_at: z.string().datetime(),
});
