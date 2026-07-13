import type { z } from "zod";
import { UserSchema, UserSettingsSchema, UserRoleSchema } from "@/shared/schemas/user";

export type UserRole = z.infer<typeof UserRoleSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;
