import type { z } from 'zod';
import { GroupSchema, GroupCreateInputSchema } from '@/shared/schemas/group';

export type Group = z.infer<typeof GroupSchema>;
export type GroupCreateInput = z.infer<typeof GroupCreateInputSchema>;
