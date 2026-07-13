import { describe, it, expect } from "bun:test"
import {
  ImageProviderSchema,
  ImageGenerateRequestSchema,
  ImageGenerateResponseSchema,
} from "@/shared/schemas/image"

describe("Image generation schemas", () => {
  it("validates all 18 providers", () => {
    const providers = [
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
    ]
    for (const p of providers) {
      const result = ImageProviderSchema.safeParse(p)
      expect(result.success).toBe(true)
    }
  })

  it("rejects unknown provider", () => {
    const result = ImageProviderSchema.safeParse("unknown")
    expect(result.success).toBe(false)
  })

  it("parses valid image request", () => {
    const result = ImageGenerateRequestSchema.safeParse({
      prompt: "a beautiful sunset",
      provider: "stableDiffusion",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.provider).toBe("stableDiffusion")
      expect(result.data.prompt).toBe("a beautiful sunset")
      expect(result.data.width).toBe(512)
      expect(result.data.height).toBe(512)
      expect(result.data.steps).toBe(20)
      expect(result.data.cfgScale).toBe(7)
      expect(result.data.count).toBe(1)
    }
  })

  it("defaults provider to stableDiffusion", () => {
    const result = ImageGenerateRequestSchema.safeParse({
      prompt: "test",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.provider).toBe("stableDiffusion")
    }
  })

  it("parses full request with all options", () => {
    const result = ImageGenerateRequestSchema.safeParse({
      prompt: "a cat",
      negativePrompt: "blurry",
      model: "sd-xl",
      width: 768,
      height: 1024,
      steps: 30,
      cfgScale: 9,
      seed: 42,
      sampler: "dpm++_2m",
      provider: "comfy",
      count: 2,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.provider).toBe("comfy")
      expect(result.data.width).toBe(768)
      expect(result.data.height).toBe(1024)
      expect(result.data.steps).toBe(30)
      expect(result.data.cfgScale).toBe(9)
      expect(result.data.seed).toBe(42)
      expect(result.data.sampler).toBe("dpm++_2m")
      expect(result.data.count).toBe(2)
    }
  })

  it("rejects request missing prompt", () => {
    const result = ImageGenerateRequestSchema.safeParse({
      provider: "stableDiffusion",
    })
    expect(result.success).toBe(false)
  })

  it("rejects width out of range", () => {
    const result = ImageGenerateRequestSchema.safeParse({
      prompt: "test",
      width: 10000,
    })
    expect(result.success).toBe(false)
  })

  it("rejects count out of range", () => {
    const result = ImageGenerateRequestSchema.safeParse({
      prompt: "test",
      count: 10,
    })
    expect(result.success).toBe(false)
  })

  it("validates image response", () => {
    const result = ImageGenerateResponseSchema.safeParse({
      images: [
        { url: "data:image/png;base64,abc123", seed: 42 },
        { url: "https://example.com/image.png", seed: 43, metadata: { model: "sd-xl" } },
      ],
      provider: "stableDiffusion",
      prompt: "a cat",
    })
    expect(result.success).toBe(true)
  })
})
