import { errorGuard } from "@/server/middleware/errorGuard"
import { chatService } from "@/server/services/chat.service"
import { NotFoundError } from "@/server/errors"
import { importChat } from "@/server/importers/chat.importer"
import type { ChatMessage } from "@/shared/types/chat"

export const chatsRoutes = {
  save: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { characterName: string; userName?: string }
    const fileId = await chatService.save(body.characterName, body.userName)
    return Response.json({ ok: true, fileId })
  }),

  get: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json().catch(() => ({}))) as { fileId: string }
    const messages = await chatService.getMessages(body.fileId)
    const metadata = await chatService.getMetadata(body.fileId)
    if (!metadata) {
      throw new NotFoundError(`Chat ${body.fileId}`)
    }
    return Response.json({ ok: true, messages, metadata })
  }),

  rename: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { fileId: string; newName: string }
    await chatService.rename(body.fileId, body.newName)
    return Response.json({ ok: true })
  }),

  delete: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { fileId: string }
    await chatService.delete(body.fileId)
    return Response.json({ ok: true })
  }),

  export: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { fileId: string; format?: "jsonl" | "text" }
    const format = body.format || "jsonl"
    if (format === "text") {
      const { data, fileName } = await chatService.exportText(body.fileId)
      return new Response(new Uint8Array(data) as unknown as Blob, {
        headers: {
          "Content-Type": "text/plain",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      })
    }
    const { data, fileName } = await chatService.exportJsonl(body.fileId)
    return new Response(new Uint8Array(data) as unknown as Blob, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  }),

  search: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json().catch(() => ({}))) as { query: string }
    const results = await chatService.search(body.query)
    return Response.json({ ok: true, results })
  }),

  recent: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json().catch(() => ({}))) as { limit?: number }
    const results = await chatService.getRecent(body.limit)
    return Response.json({ ok: true, results })
  }),

  all: errorGuard(async (req: Request): Promise<Response> => {
    const results = await chatService.listAll()
    return Response.json({ ok: true, results })
  }),

  message: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as {
      fileId: string
      action: "append" | "delete" | "edit"
      message?: ChatMessage
      index?: number
      updates?: Partial<ChatMessage>
    }

    switch (body.action) {
      case "append":
        if (!body.message) throw new NotFoundError("message required for append")
        await chatService.appendMessage(body.fileId, body.message)
        break
      case "delete":
        if (body.index === undefined) throw new NotFoundError("index required for delete")
        await chatService.deleteMessage(body.fileId, body.index)
        break
      case "edit":
        if (body.index === undefined) throw new NotFoundError("index required for edit")
        await chatService.editMessage(body.fileId, body.index, body.updates || {})
        break
    }

    return Response.json({ ok: true })
  }),

  listByCharacter: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json().catch(() => ({}))) as { characterName: string }
    const results = await chatService.listByCharacter(body.characterName)
    return Response.json({ ok: true, results })
  }),

  groupMessage: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { groupId: string; message: ChatMessage }
    await chatService.saveGroupMessage(body.groupId, body.message)
    return Response.json({ ok: true })
  }),

  listGroupChats: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json().catch(() => ({}))) as { groupId: string }
    const results = await chatService.listGroupChats(body.groupId)
    return Response.json({ ok: true, results })
  }),

  import: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as {
      messages: ChatMessage[]
      characterName: string
      userName: string
      groupId?: string
    }
    const fileId = await chatService.saveImported(
      body.messages,
      body.characterName,
      body.userName,
      body.groupId,
    )
    return Response.json({ ok: true, fileId })
  }),

  importRaw: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as {
      content: string
      characterName: string
      userName: string
      groupId?: string
    }
    const messages = importChat(body.content, body.userName, body.characterName)
    const fileId = await chatService.saveImported(
      messages,
      body.characterName,
      body.userName,
      body.groupId,
    )
    return Response.json({ ok: true, fileId })
  }),
}
