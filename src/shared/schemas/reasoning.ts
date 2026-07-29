import { z } from 'zod';

export const ReasoningSettingsSchema = z.object({
  selectedPreset: z.string(),
  prefix: z.string(),
  suffix: z.string(),
  separator: z.string(),
  autoParse: z.boolean(),
  autoExpand: z.boolean(),
  showHidden: z.boolean(),
  addToPrompts: z.boolean(),
  maxAdditions: z.number(),
});
