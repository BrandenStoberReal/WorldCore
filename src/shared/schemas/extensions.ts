import { z } from 'zod';

export const ManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/).max(128),
  displayName: z.string(),
  version: z.string().max(64),
  author: z.string(),
  description: z.string().default(''),
  js: z.string().default('index.tsx'),
  css: z.string().optional(),
  loadingOrder: z.number().default(100),
  apiVersion: z.string().optional(),
  homepage: z.string().url().optional(),
  dependencies: z.array(z.string()).default([]),
  peerDependencies: z.array(z.string()).default([]),
  enabledByDefault: z.boolean().default(false),
});

export const InstallExtensionSchema = z.object({
  url: z.string().min(1),
  branch: z
    .string()
    .regex(/^[A-Za-z0-9._\/-]+$/, 'branch must be alphanumeric/dot/dash/slash only')
    .refine((s) => !s.startsWith('-'), 'branch must not start with "-"')
    .optional(),
  scope: z.enum(['user', 'global']).default('user'),
  subfolder: z.string().regex(/^[a-z0-9-\/]+$/i, 'subfolder must be alphanumeric/dot/dash/slash').optional(),
});

export const UpdateExtensionSchema = z.object({
  id: z.string(),
});

const FORBIDDEN_SETTINGS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export const SettingsPatchSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(256)
    .regex(/^[a-zA-Z0-9._-]+$/, 'settings key must be alphanumeric/dot/dash only')
    .refine((s) => !FORBIDDEN_SETTINGS_KEYS.has(s), 'settings key is forbidden'),
  value: z.unknown(),
});

export const ExtensionRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string(),
  version: z.string(),
  author: z.string(),
  description: z.string().default(''),
  gitUrl: z.string().nullable(),
  branch: z.string().nullable(),
  subfolder: z.string().nullable().default(null),
  scope: z.enum(['user', 'global']),
  enabled: z.boolean().default(true),
  settings: z.record(z.unknown()).default({}),
  manifestCache: z.unknown().nullable(),
  installedAt: z.string().nullable(),
  lastUpdatedAt: z.string().nullable(),
  userId: z.string().default('default-user'),
});

export const ExtensionInfoSchema = ExtensionRowSchema;

export const NameExtensionSchema = z.object({
  name: z.string().min(1),
});

export const ExtensionListResponseSchema = z.array(ExtensionRowSchema);
