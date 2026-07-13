import { errorGuard } from "@/server/middleware/errorGuard"
import { paths } from "@/server/storage/paths"
import { listFiles, readFile, writeFileAtomic, exists, removeFile } from "@/server/storage/fs"
import path from "node:path"
import fs from "node:fs/promises"
import { randomUUID } from "node:crypto"
import { NotFoundError } from "@/server/errors"

export const backupsRoutes = {
  create: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { name?: string }
    const name = body.name || `backup_${Date.now()}`
    const backupId = randomUUID()
    const backupDir = path.join(paths.backups, backupId)

    await fs.mkdir(backupDir, { recursive: true })

    const manifest: Record<string, string[]> = {}
    const dirPaths = Object.values(paths)

    for (const dir of dirPaths) {
      try {
        const files = await listFiles(dir).catch(() => [] as string[])
        if (files.length > 0) {
          manifest[path.basename(dir)] = files
        }
      } catch {
        // Skip directories that don't exist or can't be read
      }
    }

    const manifestPath = path.join(backupDir, "manifest.json")
    await writeFileAtomic(manifestPath, JSON.stringify({ name, id: backupId, createdAt: Date.now(), manifest }, null, 2))

    for (const [dirName, files] of Object.entries(manifest)) {
      const srcDir = path.join(paths[dirName as keyof typeof paths] as string)
      if (!srcDir) continue
      const destDir = path.join(backupDir, dirName)
      await fs.mkdir(destDir, { recursive: true })

      for (const file of files) {
        const srcPath = path.join(srcDir, file)
        const destPath = path.join(destDir, file)
        try {
          await fs.copyFile(srcPath, destPath)
        } catch {
          // Skip files that can't be copied
        }
      }
    }

    return Response.json({ ok: true, id: backupId, name })
  }),

  restore: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { id: string }
    const backupDir = path.join(paths.backups, body.id)

    if (!(await exists(backupDir))) {
      throw new NotFoundError(`Backup "${body.id}"`)
    }

    const manifestPath = path.join(backupDir, "manifest.json")
    if (!(await exists(manifestPath))) {
      throw new NotFoundError(`Backup manifest for "${body.id}"`)
    }

    const content = await readFile(manifestPath, "utf-8")
    const manifestData = JSON.parse(content) as { manifest: Record<string, string[]> }

    for (const [dirName, files] of Object.entries(manifestData.manifest)) {
      const destDir = paths[dirName as keyof typeof paths] as string
      if (!destDir) continue

      const srcDir = path.join(backupDir, dirName)
      for (const file of files) {
        const srcPath = path.join(srcDir, file)
        const destPath = path.join(destDir, file)
        try {
          await fs.copyFile(srcPath, destPath)
        } catch {
          // Skip files that can't be restored
        }
      }
    }

    return Response.json({ ok: true })
  }),
}
