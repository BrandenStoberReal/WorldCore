import type { ZodSchema, ZodError } from "zod"
import { ValidationError } from "@/server/errors"

interface ValidateOptions {
  body?: ZodSchema
  params?: ZodSchema
  query?: ZodSchema
}

export function validate(options: ValidateOptions) {
  return function wrapper(
    handler: (
      req: Request,
      ctx: { params: Record<string, string>; body?: unknown; query?: Record<string, string> },
    ) => Promise<Response>,
  ) {
    return async (
      req: Request,
      ctx: { params: Record<string, string>; body?: unknown; query?: Record<string, string> },
    ) => {
      if (options.body && req.method !== "GET") {
        try {
          const body = await req.json()
          const parsed = options.body.parse(body)
          ctx.body = parsed
        } catch (err) {
          throw new ValidationError((err as ZodError).issues)
        }
      }

      if (options.params && ctx.params) {
        try {
          const parsed = options.params.parse(ctx.params)
          ctx.params = parsed
        } catch (err) {
          throw new ValidationError((err as ZodError).issues)
        }
      }

      if (options.query) {
        const url = new URL(req.url)
        const queryObj: Record<string, string> = {}
        for (const [key, value] of url.searchParams) {
          queryObj[key] = value
        }
        ctx.query = queryObj
        try {
          const parsed = options.query.parse(queryObj)
          ctx.query = parsed
        } catch (err) {
          throw new ValidationError((err as ZodError).issues)
        }
      }

      return handler(req, ctx)
    }
  }
}
