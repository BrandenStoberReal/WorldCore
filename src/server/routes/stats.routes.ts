import { errorGuard } from '@/server/middleware/errorGuard';
import { paths } from '@/server/storage/paths';
import { readFile, writeFileAtomic, exists } from '@/server/storage/fs';
import path from 'node:path';

export type StatsData = Record<string, unknown>;

export const statsRoutes = {
  get: errorGuard(async (_req: Request): Promise<Response> => {
    const filePath = path.join(paths.backups, 'stats.json');
    if (!(await exists(filePath))) {
      return Response.json({});
    }
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content) as StatsData;
    return Response.json(data);
  }),

  save: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as StatsData;
    const filePath = path.join(paths.backups, 'stats.json');
    await writeFileAtomic(filePath, JSON.stringify(body, null, 2));
    return Response.json({ ok: true });
  }),
};
