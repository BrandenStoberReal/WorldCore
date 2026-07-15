import { errorGuard } from '@/server/middleware/errorGuard';
import { paths } from '@/server/storage/paths';
import { listFiles, readFile, writeFileAtomic, removeFile, exists } from '@/server/storage/fs';
import path from 'node:path';

export type QuickReply = {
  title: string;
  prompt: string;
};

export const quickrepliesRoutes = {
  get: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json().catch(() => ({}))) as { name: string };
    const filePath = path.join(paths.quickreplies, `${body.name}.json`);
    if (!(await exists(filePath))) {
      return Response.json(
        { error: { code: 'NOT_FOUND', message: `Quick reply "${body.name}" not found` } },
        { status: 404 },
      );
    }
    const content = await readFile(filePath, 'utf-8');
    const reply = JSON.parse(content) as QuickReply;
    return Response.json(reply);
  }),

  save: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { reply: QuickReply };
    const reply = body.reply;
    const name = reply.title.toLowerCase().replace(/\s+/g, '-');
    const filePath = path.join(paths.quickreplies, `${name}.json`);
    await writeFileAtomic(filePath, JSON.stringify(reply, null, 2));
    return Response.json({ ok: true });
  }),

  all: errorGuard(async (_req: Request): Promise<Response> => {
    const files = await listFiles(paths.quickreplies, '.json').catch(() => [] as string[]);
    const replies: QuickReply[] = [];
    for (const file of files) {
      const filePath = path.join(paths.quickreplies, file);
      try {
        const content = await readFile(filePath, 'utf-8');
        const reply = JSON.parse(content) as QuickReply;
        replies.push(reply);
      } catch {
        // Skip invalid files
      }
    }
    return Response.json(replies);
  }),

  delete: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as { name: string };
    const filePath = path.join(paths.quickreplies, `${body.name}.json`);
    await removeFile(filePath);
    return Response.json({ ok: true });
  }),
};
