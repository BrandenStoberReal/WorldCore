import { serve, type Server } from "bun"
import path from "node:path"
import { buildApiRoutes } from "./routes"
import { ensureUserDirs } from "./storage/paths"
import { runMigrations } from "./db/migrate"

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
        { status: 404 },
      )
    }

    const filePath = path.join(distDir, pathname === "/" ? "index.html" : pathname.slice(1))
    const file = Bun.file(filePath)
    if (await file.exists()) {
      const ext = path.extname(filePath)
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
        },
      })
    }

    return new Response(htmlContent, {
      headers: { "Content-Type": "text/html" },
    })
  },
})

console.log(`SlopForge running at ${server.url}`)
export default server