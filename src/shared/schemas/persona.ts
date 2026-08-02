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
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  description: z
    .string()
    .max(10000, 'Description must be 10000 characters or less')
    .default(''),
  personality: z
    .string()
    .max(10000, 'Personality must be 10000 characters or less')
    .default(''),
  scenario: z
    .string()
    .max(10000, 'Scenario must be 10000 characters or less')
    .default(''),
  systemPrompt: z
    .string()
    .max(10000, 'System prompt must be 10000 characters or less')
    .default(''),
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
    name: z
      .string()
      .min(1, 'Name is required')
      .max(100, 'Name must be 100 characters or less')
      .optional(),
    description: z
      .string()
      .max(10000, 'Description must be 10000 characters or less')
      .optional(),
    personality: z
      .string()
      .max(10000, 'Personality must be 10000 characters or less')
      .optional(),
    scenario: z
      .string()
      .max(10000, 'Scenario must be 10000 characters or less')
      .optional(),
    systemPrompt: z
      .string()
      .max(10000, 'System prompt must be 10000 characters or less')
      .optional(),
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
