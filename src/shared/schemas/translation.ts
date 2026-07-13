import { z } from "zod"

export const TranslationProviderSchema = z.enum([
  "libre",
  "deepl",
  "google",
  "yandex",
  "lingva",
  "onering",
  "deeplx",
  "bing",
])

export const TranslateRequestSchema = z.object({
  text: z.string(),
  sourceLang: z.string(),
  targetLang: z.string(),
  provider: TranslationProviderSchema.optional().default("libre"),
})

export const TranslateResponseSchema = z.object({
  translatedText: z.string(),
  provider: z.string(),
  sourceLang: z.string(),
  targetLang: z.string(),
})
