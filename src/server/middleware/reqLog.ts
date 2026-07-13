export function reqLogMiddleware(
  handler: (req: Request, ctx: unknown) => Promise<Response>,
) {
  return async (req: Request, ctx: unknown): Promise<Response> => {
    const start = Date.now()
    const res = await handler(req, ctx)
    const duration = Date.now() - start
    console.log(`${req.method} ${new URL(req.url).pathname} ${res.status} ${duration}ms`)
    return res
  }
}
