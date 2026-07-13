import { z } from "zod"
import {
  TranslationProviderSchema,
  TranslateRequestSchema,
  TranslateResponseSchema,
} from "@/shared/schemas/translation"

export type TranslationProvider = z.infer<typeof TranslationProviderSchema>
export type TranslateRequest = z.infer<typeof TranslateRequestSchema>
export type TranslateResponse = z.infer<typeof TranslateResponseSchema>
