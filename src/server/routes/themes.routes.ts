import { errorGuard } from "@/server/middleware/errorGuard"
import { paths } from "@/server/storage/paths"
import { listFiles, readFile, writeFileAtomic, removeFile, exists } from "@/server/storage/fs"
import path from "node:path"
import type { Theme } from "@/shared/types/theme"

export const themesRoutes = {
  get: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json().catch(() => ({}))) as { name: string }
    const filePath = path.join(paths.themes, `${body.name}.json`)
    if (!(await exists(filePath))) {
      return Response.json(
        { error: { code: "NOT_FOUND", message: `Theme "${body.name}" not found` } },
        { status: 404 },
      )
    }
    const content = await readFile(filePath, "utf-8")
    const theme = JSON.parse(content) as Theme
    return Response.json(theme)
  }),

  save: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { theme: Theme }
    const theme = body.theme
    const name = (theme.name as string) || "default"
    const filePath = path.join(paths.themes, `${name}.json`)
    await writeFileAtomic(filePath, JSON.stringify(theme, null, 2))
    return Response.json({ ok: true })
  }),

  all: errorGuard(async (_req: Request): Promise<Response> => {
    const files = await listFiles(paths.themes, ".json").catch(() => [] as string[])
    const themes: Theme[] = []
    for (const file of files) {
      const filePath = path.join(paths.themes, file)
      try {
        const content = await readFile(filePath, "utf-8")
        const theme = JSON.parse(content) as Theme
        themes.push(theme)
      } catch {
        // Skip invalid files
      }
    }
    return Response.json(themes)
  }),

  delete: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { name: string }
    const filePath = path.join(paths.themes, `${body.name}.json`)
    await removeFile(filePath)
    return Response.json({ ok: true })
  }),
}
