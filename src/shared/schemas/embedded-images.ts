import { z } from 'zod';

/**
 * Embedded image size preference for chat messages.
 * Controls the maximum height of embedded images rendered in markdown.
 */
export const EmbeddedImageSizeSchema = z.enum(['small', 'medium', 'large', 'xlarge']);
export type EmbeddedImageSize = z.infer<typeof EmbeddedImageSizeSchema>;

/** Map image size presets to Tailwind max-height classes. */
export const IMAGE_SIZE_CLASSES: Record<EmbeddedImageSize, string> = {
  small: 'max-h-[20em]',    // Default - current behavior
  medium: 'max-h-[30em]',   // 1.5x default
  large: 'max-h-[40em]',    // 2x default
  xlarge: 'max-h-[60em]',   // 3x default (reasonable max for chat)
};

export const EmbeddedImagesSettingsSchema = z.object({
  /** Size preset for embedded images in chat. */
  size: EmbeddedImageSizeSchema.default('small'),
});

export const EmbeddedImagesSettingsDefaults: z.infer<typeof EmbeddedImagesSettingsSchema> = {
  size: 'small',
};
