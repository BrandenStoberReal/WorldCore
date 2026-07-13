import type { z } from "zod";
import {
  WIPositionSchema,
  WIRoleSchema,
  WorldInfoEntrySchema,
  WorldInfoSchema,
} from "@/shared/schemas/worldinfo";

export type WIPosition = z.infer<typeof WIPositionSchema>;
export type WIRole = z.infer<typeof WIRoleSchema>;
export type WorldInfoEntry = z.infer<typeof WorldInfoEntrySchema>;
export type WorldInfo = z.infer<typeof WorldInfoSchema>;
