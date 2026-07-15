import { z } from 'zod';

export const UserRoleSchema = z.enum(['admin', 'user', 'disabled']);

export const UserSettingsSchema = z
  .object({
    theme: z.string().optional(),
    language: z.string().optional(),
    catchall: z.unknown().optional(),
  })
  .catchall(z.unknown());

export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  password: z.string().optional(),
  role: UserRoleSchema,
  settings: UserSettingsSchema.optional(),
});
