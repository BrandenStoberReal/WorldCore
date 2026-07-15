import { z } from 'zod';

export const SettingsObjectSchema = z.record(z.unknown());

export const SettingsSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  data: SettingsObjectSchema,
  created_at: z.string().datetime(),
});
