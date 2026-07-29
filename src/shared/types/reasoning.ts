import type { z } from 'zod';
import { ReasoningSettingsSchema } from '@/shared/schemas/reasoning';

export type ReasoningSettings = z.infer<typeof ReasoningSettingsSchema>;
