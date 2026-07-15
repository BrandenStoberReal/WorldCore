import type { z } from 'zod';
import {
  ImageFolderSchema,
  ImageMetadataSchema,
  ImageProviderSchema,
  ImageGenerateRequestSchema,
  ImageGenerateResponseSchema,
} from '@/shared/schemas/image';

export type ImageFolder = z.infer<typeof ImageFolderSchema>;
export type ImageMetadata = z.infer<typeof ImageMetadataSchema>;
export type ImageProvider = z.infer<typeof ImageProviderSchema>;
export type ImageGenerateRequest = z.infer<typeof ImageGenerateRequestSchema>;
export type ImageGenerateResponse = z.infer<typeof ImageGenerateResponseSchema>;
