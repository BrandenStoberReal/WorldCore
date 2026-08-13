import { z } from 'zod';
import { TextOptionsSchema } from './text-options';
import { EmbeddedImagesSettingsSchema } from './embedded-images';

export const SettingsObjectSchema = z.record(z.unknown());

export const TypedSettingsSchema = z.object({
  textOptions: TextOptionsSchema.optional(),
  embeddedImages: EmbeddedImagesSettingsSchema.optional(),
});

export const SettingsSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  data: SettingsObjectSchema,
  created_at: z.string().datetime(),
});
