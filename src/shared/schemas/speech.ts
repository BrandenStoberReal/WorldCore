import { z } from "zod";

export const TTSProviderSchema = z.enum([
  "openai",
  "azure",
  "elevenlabs",
  "edge",
  "coqui",
  "bark",
  "custom",
  "silero",
]);

export const STTProviderSchema = z.enum([
  "openai",
  "whispercpp",
  "custom",
]);

export const TTSSynthesizeRequestSchema = z.object({
  text: z.string(),
  voice: z.string().optional(),
  model: z.string().optional(),
  speed: z.number().min(0.25).max(4).optional().default(1),
  provider: TTSProviderSchema.optional().default("openai"),
});

export const TTSSynthesizeResponseSchema = z.object({
  audioBase64: z.string(),
  provider: z.string(),
  voice: z.string().optional(),
  duration: z.number().optional(),
});

export const STTTranscribeRequestSchema = z.object({
  audioBase64: z.string(),
  model: z.string().optional(),
  language: z.string().optional(),
  provider: STTProviderSchema.optional().default("openai"),
});

export const STTTranscribeResponseSchema = z.object({
  text: z.string(),
  provider: z.string(),
  language: z.string().optional(),
  duration: z.number().optional(),
  words: z.array(z.object({
    word: z.string(),
    start: z.number(),
    end: z.number(),
  })).optional(),
});
