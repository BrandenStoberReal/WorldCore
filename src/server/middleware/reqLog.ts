export function reqLogMiddleware(handler: (req: Request, ctx: unknown) => Promise<Response>) {
  return async (req: Request, ctx: unknown): Promise<Response> => {
    const start = Date.now();
    const res = await handler(req, ctx);
    const duration = Date.now() - start;
    try {
      const pathname = new URL(req.url).pathname;
      console.log(`${req.method} ${pathname} ${res.status} ${duration}ms`);
    } catch {
      console.log(`${req.method} <invalid-url> ${res.status} ${duration}ms`);
    }
    return res;
  };
}
