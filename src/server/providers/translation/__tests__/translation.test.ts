import { describe, it, expect, mock } from "bun:test"
import { TranslateRequestSchema, TranslationProviderSchema, TranslateResponseSchema } from "@/shared/schemas/translation"

describe("Translation schemas", () => {
  it("validates all 8 providers", () => {
    const providers = ["libre", "deepl", "google", "yandex", "lingva", "onering", "deeplx", "bing"]
    for (const p of providers) {
      const result = TranslationProviderSchema.safeParse(p)
      expect(result.success).toBe(true)
    }
  })

  it("rejects unknown provider", () => {
    const result = TranslationProviderSchema.safeParse("unknown")
    expect(result.success).toBe(false)
  })

  it("parses valid translate request", () => {
    const result = TranslateRequestSchema.safeParse({
      text: "hello",
      sourceLang: "en",
      targetLang: "fr",
      provider: "google",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.provider).toBe("google")
    }
  })

  it("defaults provider to libre", () => {
    const result = TranslateRequestSchema.safeParse({
      text: "hello",
      sourceLang: "en",
      targetLang: "fr",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.provider).toBe("libre")
    }
  })

  it("rejects request missing text", () => {
    const result = TranslateRequestSchema.safeParse({
      sourceLang: "en",
      targetLang: "fr",
    })
    expect(result.success).toBe(false)
  })

  it("validates translate response", () => {
    const result = TranslateResponseSchema.safeParse({
      translatedText: "bonjour",
      provider: "google",
      sourceLang: "en",
      targetLang: "fr",
    })
    expect(result.success).toBe(true)
  })
})
