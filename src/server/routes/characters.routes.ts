import { errorGuard } from "@/server/middleware/errorGuard"
import { characterService } from "@/server/services/character.service"
import { importCharacter } from "@/server/importers/character.importer"
import { exportCharacter, type ExportFormat } from "@/server/exporters/character.exporter"
import { paths } from "@/server/storage/paths"
import path from "node:path"
import type { CharacterCreateInput } from "@/shared/types/character"

export const characterRoutes = {
  create: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as CharacterCreateInput
    const result = await characterService.create(body)
    return Response.json({ ok: true, id: result.id })
  }),

  rename: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { id: number; newName: string }
    await characterService.rename(body.id, body.newName)
    return Response.json({ ok: true })
  }),

  edit: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { id: number; data: Record<string, unknown> }
    await characterService.edit(body.id, body.data)
    return Response.json({ ok: true })
  }),

  editAvatar: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { id: number; avatar: string }
    let avatarData: string | Buffer
    if (body.avatar.startsWith("data:image/")) {
      const base64Data = body.avatar.split(",")[1]
      avatarData = Buffer.from(base64Data!, "base64")
    } else {
      avatarData = body.avatar
    }
    await characterService.editAvatar(body.id, avatarData)
    return Response.json({ ok: true })
  }),

  getAvatar: errorGuard(async (req: Request): Promise<Response> => {
    const url = new URL(req.url)
    const id = Number(url.searchParams.get("id"))
    if (!id) {
      return Response.json({ error: { code: "VALIDATION_ERROR", message: "Missing id parameter" } }, { status: 400 })
    }
    const char = await characterService.get(id)
    if (!char) {
      return Response.json({ error: { code: "NOT_FOUND", message: "Character not found" } }, { status: 404 })
    }
    const avatarPath = path.join(paths.characters, char.avatar)
    const file = Bun.file(avatarPath)
    if (!(await file.exists())) {
      return Response.json({ error: { code: "NOT_FOUND", message: "Avatar not found" } }, { status: 404 })
    }
    return new Response(file.stream(), {
      headers: { "Content-Type": "image/png" },
    })
  }),

  editAttribute: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { id: number; field: string; value: string | string[] | boolean | number }
    await characterService.editAttribute(body.id, body.field, body.value)
    return Response.json({ ok: true })
  }),

  mergeAttributes: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { id: number; attrs: Record<string, unknown> }
    await characterService.mergeAttributes(body.id, body.attrs)
    return Response.json({ ok: true })
  }),

  delete: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { id: number }
    await characterService.delete(body.id)
    return Response.json({ ok: true })
  }),

  all: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json().catch(() => ({}))) as { shallow?: boolean }
    const result = await characterService.getAll(body.shallow)
    return Response.json(result)
  }),

  get: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json().catch(() => ({}))) as { id: number }
    const result = await characterService.get(body.id)
    return Response.json(result)
  }),

  chats: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json().catch(() => ({}))) as { fileName: string }
    const result = await characterService.getChats(body.fileName)
    return Response.json(result)
  }),

  duplicate: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { id: number }
    const newId = await characterService.duplicate(body.id)
    return Response.json({ ok: true, id: newId })
  }),

  import: errorGuard(async (req: Request): Promise<Response> => {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return Response.json({ error: { code: "VALIDATION_ERROR", message: "Missing file" } }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const tempPath = `/tmp/slopforge_import_${Date.now()}_${file.name}`
    await Bun.write(tempPath, buffer)

    const id = await importCharacter(tempPath, file.name)
    return Response.json({ ok: true, id })
  }),

  export: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { id: number; format: ExportFormat }
    const result = await exportCharacter(body.id, body.format)
    return new Response(result.data as unknown as Blob, {
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
      },
    })
  }),
}
