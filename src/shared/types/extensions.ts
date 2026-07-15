import type { z } from 'zod';
import {
  ExtensionInfoSchema,
  InstallExtensionSchema,
  NameExtensionSchema,
  ExtensionListResponseSchema,
} from '@/shared/schemas/extensions';

export type ExtensionInfo = z.infer<typeof ExtensionInfoSchema>;
export type InstallExtensionRequest = z.infer<typeof InstallExtensionSchema>;
export type NameExtensionRequest = z.infer<typeof NameExtensionSchema>;
export type ExtensionListResponse = z.infer<typeof ExtensionListResponseSchema>;
