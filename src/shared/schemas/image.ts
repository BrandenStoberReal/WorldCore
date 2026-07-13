import { z } from "zod";

export const ImageFolderSchema = z.enum(["characters", "chats", "groups", "avatars", "backgrounds"]);

export const ImageMetadataSchema = z.object({
  filename: z.string(),
  folder: ImageFolderSchema,
  width: z.number().int(),
  height: z.number().int(),
  size: z.number().int(),
  format: z.string(),
});

export const ImageProviderSchema = z.enum([
  "stableDiffusion",
  "comfy",
  "comfyrunpod",
  "together",
  "sdcpp",
  "drawthings",
  "pollinations",
  "stability",
  "huggingface",
  "chutes",
  "electronhub",
  "nanogpt",
  "bfl",
  "falai",
  "xai",
  "aimlapi",
  "zai",
  "workersai",
]);

export const ImageGenerateRequestSchema = z.object({
  prompt: z.string(),
  negativePrompt: z.string().optional().default(""),
  model: z.string().optional(),
  width: z.number().int().min(64).max(8192).optional().default(512),
  height: z.number().int().min(64).max(8192).optional().default(512),
  steps: z.number().int().min(1).max(1000).optional().default(20),
  cfgScale: z.number().min(0).max(30).optional().default(7),
  seed: z.number().int().optional(),
  sampler: z.string().optional(),
  provider: ImageProviderSchema.optional().default("stableDiffusion"),
  count: z.number().int().min(1).max(4).optional().default(1),
});

export const ImageGenerateResponseSchema = z.object({
  images: z.array(z.object({
    url: z.string(),
    seed: z.number().int().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })),
  provider: z.string(),
  prompt: z.string(),
});
