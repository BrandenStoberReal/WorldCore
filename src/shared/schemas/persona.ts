import { z } from 'zod';

/**
 * Full persona shape — mirrors the `personas` DB table columns.
 * Used for read responses (get / getDefault / all).
 */
export const PersonaSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().default(''),
  personality: z.string().default(''),
  scenario: z.string().default(''),
  systemPrompt: z.string().default(''),
  avatar: z.string().default(''),
  isDefault: z.boolean().default(false),
  dateAdded: z.number(),
  dateModified: z.number(),
});

/**
 * Input for creating a new persona. `name` is required; all other content
 * fields default to empty strings. `isDefault` may be set at creation time
 * (the service clears any prior default transactionally when true).
 */
export const PersonaCreateInputSchema = z.object({
  name: z.string(),
  description: z.string().default(''),
  personality: z.string().default(''),
  scenario: z.string().default(''),
  systemPrompt: z.string().default(''),
  avatar: z.string().default(''),
  isDefault: z.boolean().default(false),
});

/**
 * Partial edit input. `isDefault` is intentionally omitted — default
 * promotion must go through the dedicated setDefault route so the
 * invariant (at most one default per user) is enforced transactionally.
 */
export const PersonaEditInputSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    personality: z.string().optional(),
    scenario: z.string().optional(),
    systemPrompt: z.string().optional(),
  })
  .partial();

/**
 * Input for the set-avatar endpoint: target persona id + the stored
 * avatar file name (written by the avatar upload route).
 */
export const PersonaSetAvatarInputSchema = z.object({
  id: z.number(),
  avatar: z.string(),
});
