import { z } from "zod"

export const SSOProviderSchema = z.enum(["authelia", "authentik", "basicauth"])

export const SSOSettingsSchema = z.object({
  provider: SSOProviderSchema.optional().default("basicauth"),
  enabled: z.boolean().default(false),
  autheliaUrl: z.string().optional(),
  autheliaRedirectUrl: z.string().optional(),
  authentikBaseUrl: z.string().optional(),
  authentikClientId: z.string().optional(),
  authentikClientSecret: z.string().optional(),
  authentikRedirectUrl: z.string().optional(),
  basicAuthUsers: z.array(z.object({
    username: z.string(),
    password: z.string(),
    role: z.enum(["user", "admin"]).default("user"),
  })).optional().default([]),
})

export const SSOCallbackRequestSchema = z.object({
  provider: SSOProviderSchema,
  code: z.string().optional(),
  state: z.string().optional(),
  id_token: z.string().optional(),
  authorization: z.string().optional(),
})
