import { z } from 'zod';
import {
  TextOptionsSchema,
  SyspromptSettingsSchema,
  ContextSettingsSchema,
  InstructSettingsSchema,
} from '@/shared/schemas/text-options';

export type TextOptions = z.infer<typeof TextOptionsSchema>;
export type SyspromptSettings = z.infer<typeof SyspromptSettingsSchema>;
export type ContextSettings = z.infer<typeof ContextSettingsSchema>;
export type InstructSettings = z.infer<typeof InstructSettingsSchema>;
