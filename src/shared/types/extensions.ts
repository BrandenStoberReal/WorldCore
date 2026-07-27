import type { z } from 'zod';
import {
  ManifestSchema,
  InstallExtensionSchema,
  UpdateExtensionSchema,
  ExtensionRowSchema,
  SettingsPatchSchema,
  ExtensionInfoSchema,
  NameExtensionSchema,
  ExtensionListResponseSchema,
} from '@/shared/schemas/extensions';

export type Manifest = z.infer<typeof ManifestSchema>;
export type InstallExtensionInput = z.infer<typeof InstallExtensionSchema>;
export type UpdateExtensionInput = z.infer<typeof UpdateExtensionSchema>;
export type ExtensionRow = z.infer<typeof ExtensionRowSchema>;
export type SettingsPatch = z.infer<typeof SettingsPatchSchema>;
export type ExtensionScope = 'user' | 'global';
export type WorldCoreAPIVersion = string;

export type ExtensionInfo = ExtensionRow;
export type InstallExtensionRequest = InstallExtensionInput;
export type NameExtensionRequest = z.infer<typeof NameExtensionSchema>;
export type ExtensionListResponse = z.infer<typeof ExtensionListResponseSchema>;
