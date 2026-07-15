import type { z } from 'zod';
import {
  SSOSettingsSchema,
  SSOCallbackRequestSchema,
  SSOProviderSchema,
} from '@/shared/schemas/sso';

export type SSOProvider = z.infer<typeof SSOProviderSchema>;
export type SSOSettings = z.infer<typeof SSOSettingsSchema>;
export type SSOCallbackRequest = z.infer<typeof SSOCallbackRequestSchema>;
