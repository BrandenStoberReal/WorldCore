import { errorGuard } from "@/server/middleware/errorGuard"
import { paths } from "@/server/storage/paths"
import { readFile, writeFileAtomic, exists } from "@/server/storage/fs"
import path from "node:path"

export type MovingUIConfig = Record<string, unknown>

export const movinguiRoutes = {
  get: errorGuard(async (_req: Request): Promise<Response> => {
    const filePath = path.join(paths.movingUI, "config.json")
    if (!(await exists(filePath))) {
      return Response.json({})
    }
    const content = await readFile(filePath, "utf-8")
    const config = JSON.parse(content) as MovingUIConfig
    return Response.json(config)
  }),

  save: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as MovingUIConfig
    const filePath = path.join(paths.movingUI, "config.json")
    await writeFileAtomic(filePath, JSON.stringify(body, null, 2))
    return Response.json({ ok: true })
  }),
}
