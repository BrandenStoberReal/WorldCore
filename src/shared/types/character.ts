import type { z } from 'zod';
import {
  CharacterSpecVersionSchema,
  CharacterSpecSchema,
  RoleSchema,
  DepthPromptSchema,
  CharacterExtensionsSchema,
  CharacterBookEntrySchema,
  CharacterBookSchema,
  CharacterDataSchema,
  CharacterSchema,
  ShallowCharacterSchema,
  CharacterCreateInputSchema,
  CharacterEditAttributeInputSchema,
  CropSchema,
} from '@/shared/schemas/character';

export type CharacterSpecVersion = z.infer<typeof CharacterSpecVersionSchema>;
export type CharacterSpec = z.infer<typeof CharacterSpecSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type DepthPrompt = z.infer<typeof DepthPromptSchema>;
export type CharacterExtensions = z.infer<typeof CharacterExtensionsSchema>;
export type CharacterBookEntry = z.infer<typeof CharacterBookEntrySchema>;
export type CharacterBook = z.infer<typeof CharacterBookSchema>;
export type CharacterData = z.infer<typeof CharacterDataSchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type ShallowCharacter = z.infer<typeof ShallowCharacterSchema>;
export type CharacterCreateInput = z.infer<typeof CharacterCreateInputSchema>;
export type CharacterEditAttributeInput = z.infer<typeof CharacterEditAttributeInputSchema>;
export type Crop = z.infer<typeof CropSchema>;
