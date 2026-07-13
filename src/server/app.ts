import { serve, type Server } from "bun"
import path from "node:path"
import { buildApiRoutes } from "./routes"
import { ensureUserDirs } from "./storage/paths"
import { runMigrations } from "./db/migrate"
import { safePathWithin } from "./util/safePath"
import { securityHeaders } from "./errors"

runMigrations()
ensureUserDirs()

const apiRoutes = buildApiRoutes()

const distDir = path.join(process.cwd(), "dist")
const distHtml = Bun.file(path.join(distDir, "index.html"))
const htmlContent = await distHtml.text()

const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? "127.0.0.1"

const server = serve({
  port: PORT,
  hostname: HOST,
  async fetch(req: Request, _server: Server<unknown>) {
    const url = new URL(req.url)
    const pathname = url.pathname

    if (pathname.startsWith("/api/")) {
      const handler = apiRoutes[pathname]
      if (handler) {
        return handler(req)
      }
      return Response.json(
        { error: { code: "NOT_FOUND", message: `Route not found: ${pathname}` } },
        { status: 404, headers: securityHeaders },
      )
    }

    const userPath = pathname === "/" ? "index.html" : pathname.slice(1)
    const safePath = safePathWithin(distDir, userPath)
    if (!safePath) {
      return new Response(htmlContent, {
        headers: { "Content-Type": "text/html", ...securityHeaders },
        status: 404,
      })
    }
    const file = Bun.file(safePath)
    if (await file.exists()) {
      const ext = path.extname(safePath)
      const mimeTypes: Record<string, string> = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".json": "application/json",
      }
      return new Response(file.stream(), {
        headers: {
          "Content-Type": mimeTypes[ext] || "application/octet-stream",
          ...securityHeaders,
        },
      })
    }

    return new Response(htmlContent, {
      headers: { "Content-Type": "text/html", ...securityHeaders },
    })
  },
})

console.log(`SlopForge running at ${server.url}`)
export default server