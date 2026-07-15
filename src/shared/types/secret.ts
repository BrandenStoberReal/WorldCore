import type { z } from 'zod';
import {
  SecretKeySchema,
  SecretValueSchema,
  SecretStateSchema,
  SecretStateMapSchema,
} from '@/shared/schemas/secret';

export type SecretKey = z.infer<typeof SecretKeySchema>;
export type SecretValue = z.infer<typeof SecretValueSchema>;
export type SecretState = z.infer<typeof SecretStateSchema>;
export type SecretStateMap = z.infer<typeof SecretStateMapSchema>;
