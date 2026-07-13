import { errorGuard } from "@/server/middleware/errorGuard"
import { SearchRequestSchema, SearchResponseSchema } from "@/shared/schemas/search"
import { search } from "@/server/providers/search"
import { ValidationError } from "@/server/errors"

export const searchRoutes = {
  POST: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as Record<string, unknown>
    const parsed = SearchRequestSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors)
    }
    const results = await search(parsed.data.query, parsed.data.provider)
    const result = SearchResponseSchema.parse({
      results,
      provider: parsed.data.provider,
      query: parsed.data.query,
    })
    return Response.json(result)
  }),
}
