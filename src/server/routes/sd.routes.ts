import { errorGuard } from "@/server/middleware/errorGuard"
import { ImageGenerateRequestSchema, ImageGenerateResponseSchema } from "@/shared/schemas/image"
import { generateImage } from "@/server/providers/image"
import { ValidationError } from "@/server/errors"

export const sdRoutes = {
  generate: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as Record<string, unknown>
    const parsed = ImageGenerateRequestSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors)
    }

    const images = await generateImage(parsed.data.provider, {
      prompt: parsed.data.prompt,
      negativePrompt: parsed.data.negativePrompt,
      model: parsed.data.model,
      width: parsed.data.width,
      height: parsed.data.height,
      steps: parsed.data.steps,
      cfgScale: parsed.data.cfgScale,
      seed: parsed.data.seed,
      sampler: parsed.data.sampler,
      count: parsed.data.count,
    })

    const result = ImageGenerateResponseSchema.parse({
      images,
      provider: parsed.data.provider,
      prompt: parsed.data.prompt,
    })

    return Response.json(result)
  }),
}
