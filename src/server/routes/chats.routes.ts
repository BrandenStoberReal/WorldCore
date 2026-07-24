import { errorGuard } from '@/server/middleware/errorGuard';
import { withUserId } from '@/server/middleware/withUserId';
import { chatService } from '@/server/services/chat.service';
import { ensureUserChatDirs } from '@/server/storage/paths';
import { NotFoundError } from '@/server/errors';
import { assertValidFileId } from '@/server/util/ids';
import { importChat } from '@/server/importers/chat.importer';
import type { ChatMessage } from '@/shared/types/chat';

export const chatsRoutes = {
  save: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      ensureUserChatDirs(userId);
      const body = (await req.json()) as {
        characterName: string;
        userName?: string;
        characterId?: number;
      };
      const fileId = await chatService.save(
        userId,
        body.characterName,
        body.userName,
        body.characterId,
      );
      return Response.json({ ok: true, fileId });
    }),
  ),

  get: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json().catch(() => ({}))) as { fileId: string };
      assertValidFileId(body.fileId);
      const messages = await chatService.getMessages(userId, body.fileId);
      const metadata = await chatService.getMetadata(userId, body.fileId);
      if (!metadata) {
        throw new NotFoundError(`Chat ${body.fileId}`);
      }
      return Response.json({ ok: true, messages, metadata });
    }),
  ),

  rename: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { fileId: string; newName: string };
      await chatService.rename(userId, body.fileId, body.newName);
      return Response.json({ ok: true });
    }),
  ),

  setPersona: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { fileId: string; personaId: number | null };
      await chatService.setPersona(userId, body.fileId, body.personaId);
      return Response.json({ ok: true });
    }),
  ),

  delete: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { fileId: string };
      await chatService.delete(userId, body.fileId);
      return Response.json({ ok: true });
    }),
  ),

  export: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { fileId: string; format?: 'jsonl' | 'text' };
      const format = body.format || 'jsonl';
      if (format === 'text') {
        const { data, fileName } = await chatService.exportText(userId, body.fileId);
        return new Response(new Uint8Array(data) as unknown as Blob, {
          headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="${fileName}"`,
          },
        });
      }
      const { data, fileName } = await chatService.exportJsonl(userId, body.fileId);
      return new Response(new Uint8Array(data) as unknown as Blob, {
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Content-Disposition': `attachment; filename="${fileName}"`,
        },
      });
    }),
  ),

  search: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json().catch(() => ({}))) as { query: string };
      const results = await chatService.search(userId, body.query);
      return Response.json({ ok: true, results });
    }),
  ),

  recent: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json().catch(() => ({}))) as { limit?: number };
      const results = await chatService.getRecent(userId, body.limit);
      return Response.json({ ok: true, results });
    }),
  ),

  all: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const results = await chatService.listAll(userId);
      return Response.json({ ok: true, results });
    }),
  ),

  message: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as {
        fileId: string;
        action: 'append' | 'delete' | 'edit';
        message?: ChatMessage;
        index?: number;
        updates?: Partial<ChatMessage>;
      };

      switch (body.action) {
        case 'append':
          if (!body.message) throw new NotFoundError('message required for append');
          await chatService.appendMessage(userId, body.fileId, body.message);
          break;
        case 'delete':
          if (body.index === undefined) throw new NotFoundError('index required for delete');
          await chatService.deleteMessage(userId, body.fileId, body.index);
          break;
        case 'edit':
          if (body.index === undefined) throw new NotFoundError('index required for edit');
          await chatService.editMessage(userId, body.fileId, body.index, body.updates || {});
          break;
      }

      return Response.json({ ok: true });
    }),
  ),

  listByCharacter: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      ensureUserChatDirs(userId);
      const body = (await req.json().catch(() => ({}))) as { characterName: string };
      const results = await chatService.listByCharacter(userId, body.characterName);
      return Response.json({ ok: true, results });
    }),
  ),

  groupMessage: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      ensureUserChatDirs(userId);
      const body = (await req.json()) as { groupId: string; message: ChatMessage };
      await chatService.saveGroupMessage(userId, body.groupId, body.message);
      return Response.json({ ok: true });
    }),
  ),

  listGroupChats: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json().catch(() => ({}))) as { groupId: string };
      const results = await chatService.listGroupChats(userId, body.groupId);
      return Response.json({ ok: true, results });
    }),
  ),

  import: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      ensureUserChatDirs(userId);
      const body = (await req.json()) as {
        messages: ChatMessage[];
        characterName: string;
        userName: string;
        groupId?: string;
      };
      const fileId = await chatService.saveImported(
        userId,
        body.messages,
        body.characterName,
        body.userName,
        body.groupId,
      );
      return Response.json({ ok: true, fileId });
    }),
  ),

  importRaw: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      ensureUserChatDirs(userId);
      const body = (await req.json()) as {
        content: string;
        characterName: string;
        userName: string;
        groupId?: string;
      };
      const messages = importChat(body.content, body.userName, body.characterName);
      const fileId = await chatService.saveImported(
        userId,
        messages,
        body.characterName,
        body.userName,
        body.groupId,
      );
      return Response.json({ ok: true, fileId });
    }),
  ),
};
