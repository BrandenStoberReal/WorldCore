import type { z } from 'zod';
import type {
  PersonaSchema,
  PersonaCreateInputSchema,
  PersonaEditInputSchema,
  PersonaSetAvatarInputSchema,
} from '@/shared/schemas/persona';

export type Persona = z.infer<typeof PersonaSchema>;
export type PersonaCreateInput = z.infer<typeof PersonaCreateInputSchema>;
export type PersonaEditInput = z.infer<typeof PersonaEditInputSchema>;
export type PersonaSetAvatarInput = z.infer<typeof PersonaSetAvatarInputSchema>;
