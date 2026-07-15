import type { z } from 'zod';
import {
  GenSettingsSchema,
  GenParamsSchema,
  GenResultSchema,
} from '@/shared/schemas/backends/common';

export type GenSettings = z.infer<typeof GenSettingsSchema>;
export type GenParams = z.infer<typeof GenParamsSchema>;
export type GenResult = z.infer<typeof GenResultSchema>;
