import { errorGuard } from '@/server/middleware/errorGuard';
import { withUserId } from '@/server/middleware/withUserId';
import { settingsService } from '@/server/services/settings.service';
import {
  AddBrowserInstalledInputSchema,
  RemoveBrowserInstalledInputSchema,
  BrowserInstalledCharactersSchema,
} from '@/shared/schemas/character';
import { ValidationError } from '@/server/errors';

const SETTINGS_KEY = 'browserInstalledCharacters';

async function getInstalled(userId: string) {
  const settings = await settingsService.get(userId);
  const raw = settings[SETTINGS_KEY];
  if (!raw) return [];
  const parsed = BrowserInstalledCharactersSchema.safeParse(raw);
  return parsed.success ? parsed.data : [];
}

async function saveInstalled(userId: string, data: unknown) {
  const settings = await settingsService.get(userId);
  await settingsService.save({ ...settings, [SETTINGS_KEY]: data }, userId);
}

export const browserInstalledRoutes = {
  list: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const installed = await getInstalled(userId);
      return Response.json(installed);
    }),
  ),

  add: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as unknown;
      const parsed = AddBrowserInstalledInputSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.flatten());
      }

      const installed = await getInstalled(userId);
      const exists = installed.some(
        (item) => item.sourceId === parsed.data.sourceId && item.cardId === parsed.data.cardId,
      );

      if (!exists) {
        installed.push({
          ...parsed.data,
          installedAt: new Date().toISOString(),
        });
        await saveInstalled(userId, installed);
      }

      return Response.json({ ok: true });
    }),
  ),

  remove: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as unknown;
      const parsed = RemoveBrowserInstalledInputSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.flatten());
      }

      const installed = await getInstalled(userId);
      const filtered = installed.filter(
        (item) => !(item.sourceId === parsed.data.sourceId && item.cardId === parsed.data.cardId),
      );

      if (filtered.length !== installed.length) {
        await saveInstalled(userId, filtered);
      }

      return Response.json({ ok: true });
    }),
  ),
};
