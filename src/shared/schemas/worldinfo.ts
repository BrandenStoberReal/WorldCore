import { z } from "zod";

export const WIPositionSchema = z.enum(["0", "1", "2", "3", "4"]).transform(Number);
export const WIRoleSchema = z.enum(["", "0", "1", "2"]);

export const WorldInfoEntrySchema = z.object({
  uid: z.string(),
  key: z.string(),
  keysecondary: z.array(z.string()).default([]),
  comment: z.string().default(""),
  content: z.string().default(""),
  constant: z.boolean().default(false),
  vectorized: z.boolean().default(false),
  selective: z.boolean().default(false),
  selectiveLogic: z.number().int().default(0),
  addMemo: z.boolean().default(false),
  order: z.number().int().default(0),
  position: z.number().int().default(0),
  disable: z.boolean().default(false),
  excludeRecursion: z.boolean().default(false),
  preventRecursion: z.boolean().default(false),
  delayUntilRecursion: z.boolean().default(false),
  probability: z.number().default(1),
  useProbability: z.boolean().default(false),
  depth: z.number().int().default(0),
  group: z.number().int().default(0),
  groupOverride: z.boolean().default(false),
  groupWeight: z.number().default(1),
  scanDepth: z.number().int().default(0),
  caseSensitive: z.boolean().default(false),
  matchWholeWords: z.boolean().default(false),
  automationId: z.string().default(""),
  role: z.string().default(""),
  sticky: z.boolean().default(false),
  cooldown: z.number().int().default(0),
  delay: z.number().int().default(0),
  matchPersonaDescription: z.boolean().default(false),
  matchCharacterDescription: z.boolean().default(false),
  matchCharacterPersonality: z.boolean().default(false),
  matchCharacterDepthPrompt: z.boolean().default(false),
  matchScenario: z.boolean().default(false),
  matchCreatorNotes: z.boolean().default(false),
  triggers: z.string().default(""),
  ignoreBudget: z.boolean().default(false),
  extensions: z.record(z.unknown()).optional(),
});

export const WorldInfoSchema = z.object({
  name: z.string(),
  entries: z.record(z.string(), WorldInfoEntrySchema),
  extensions: z.record(z.unknown()).optional(),
});
