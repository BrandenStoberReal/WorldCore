import type { z } from 'zod';
import { SettingsObjectSchema, SettingsSnapshotSchema } from '@/shared/schemas/settings';

export type SettingsObject = z.infer<typeof SettingsObjectSchema>;
export type SettingsSnapshot = z.infer<typeof SettingsSnapshotSchema>;
