import { z } from 'zod';

export const ExtensionInfoSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  version: z.string(),
  description: z.string(),
  author: z.string(),
  enabled: z.boolean(),
  gitUrl: z.string().url().optional(),
  lastUpdated: z.string().datetime().optional(),
  manifest: z.record(z.unknown()),
});

export const InstallExtensionSchema = z.object({
  url: z.string().url(),
  targetDir: z.string().optional(),
});

export const NameExtensionSchema = z.object({
  name: z.string().min(1),
});

export const ExtensionListResponseSchema = z.array(ExtensionInfoSchema);
