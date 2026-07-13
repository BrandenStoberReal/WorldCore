import { errorGuard } from "@/server/middleware/errorGuard"
import { TranslateRequestSchema, TranslateResponseSchema } from "@/shared/schemas/translation"
import { translate } from "@/server/providers/translation"
import { ValidationError } from "@/server/errors"

export const translateRoutes = {
  POST: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as Record<string, unknown>
    const parsed = TranslateRequestSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors)
    }
    const translatedText = await translate(
      parsed.data.text,
      parsed.data.sourceLang,
      parsed.data.targetLang,
      parsed.data.provider,
    )
    const result = TranslateResponseSchema.parse({
      translatedText,
      provider: parsed.data.provider,
      sourceLang: parsed.data.sourceLang,
      targetLang: parsed.data.targetLang,
    })
    return Response.json(result)
  }),
}
