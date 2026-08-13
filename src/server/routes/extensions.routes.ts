import path from 'node:path';
import { existsSync } from 'node:fs';
import { errorGuard } from '@/server/middleware/errorGuard';
import { withExtensionUserId } from '@/server/auth/withExtensionUserId';
import { requireAdminForGlobal } from '@/server/auth/extensionAdmin';
import {
  listExtensions,
  getExtension,
  installExtension,
  uninstallExtension,
  updateExtension,
  updateAllExtensions,
  toggleExtension,
  patchSettings,
  getSettings,
  validateManifest,
} from '@/server/services/extensions.service';
import { InstallExtensionSchema, SettingsPatchSchema } from '@/shared/schemas/extensions';
import { ValidationError, NotFoundError, securityHeaders } from '@/server/errors';
import {
  getGlobalExtensionPath,
  getUserExtensionPath,
  safeExtensionPath,
} from '@/server/storage/paths';
import { resolveMimeType } from '@/server/mime';
import { SHARED_CONST } from '@/shared/constants';

const PREFIX = SHARED_CONST.API_VERSION_PREFIX;
const ASSET_PREFIX = `${PREFIX}/extensions/assets/`;

const DIST_EXTENSIONS_DIR = path.join(process.cwd(), 'dist', 'extensions');

const SCRIPT_EXTS = new Set(['.ts', '.tsx', '.jsx', '.js']);

/**
 * Built artifact lookup for an extension asset request.
 *
 * `bun run build` bundles each extension's manifest entrypoint (eg. index.tsx)
 * into a single self-contained ES module at dist/extensions/<extId>/index.js,
 * with bare imports (react, react-dom, ...) resolved and JSX compiled. The
 * loader still requests the source manifest's `js` filename
 * (eg. /assets/outfit/index.tsx), so this maps the requested relPath onto the
 * built .js when one exists. Returns null when no built artifact matches,
 * leaving the caller to fall back to serving source (eg. CSS, PNG, dev mode
 * where the build wasn't run).
 */
function resolveBuiltAsset(
  extId: string,
  relPath: string,
): { abs: string; contentType: string } | null {
  const reqExt = path.extname(relPath).toLowerCase();
  if (!SCRIPT_EXTS.has(reqExt)) return null;
  const builtJs = path.join(DIST_EXTENSIONS_DIR, extId, 'index.js');
  if (!existsSync(builtJs)) return null;
  return { abs: builtJs, contentType: 'application/javascript' };
}

/**
 * Resolve the on-disk directory for an extension row. Local-wins on collision
 * is enforced at listing time in the service; here we look up the row to find
 * the scope, then map to the matching directory.
 */
async function resolveExtDir(userId: string, extId: string): Promise<string | null> {
  const row = await getExtension(userId, extId);
  if (!row) return null;
  return row.scope === 'global'
    ? getGlobalExtensionPath(extId)
    : getUserExtensionPath(userId, extId);
}

export const extensionsRoutes = {
  /**
   * List all extensions visible to the user: their own + global preinstalled.
   * Local-wins on collision (user row shadows global row of same id).
   */
  list: errorGuard(
    withExtensionUserId(async (_req: Request, userId: string): Promise<Response> => {
      const extensions = await listExtensions(userId);
      return Response.json(extensions);
    }),
  ),

  /**
   * Get a single extension by id (scoped: user-own or global).
   */
  get: errorGuard(
    withExtensionUserId(async (req: Request, userId: string): Promise<Response> => {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      if (!id) {
        throw new ValidationError({ message: 'Missing id query parameter' });
      }
      const row = await getExtension(userId, id);
      if (!row) {
        throw new NotFoundError(`Extension "${id}"`);
      }
      return Response.json(row);
    }),
  ),

  /**
   * Install a new extension. Validates manifest clone → move → DB insert.
   * Global scope requires `WORLDCORE_ALLOW_ADMIN_GLOBAL_INSTALL=1`.
   */
  install: errorGuard(
    withExtensionUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as unknown;
      const parsed = InstallExtensionSchema.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.flatten());
      }
      if (parsed.data.scope === 'global') {
        requireAdminForGlobal();
      }
      const result = await installExtension(userId, parsed.data);
      return Response.json({ ok: true, extension: result });
    }),
  ),

  /**
   * Validate a manifest object without installing. Useful for the panel UI
   * to surface manifest issues before the user commits to install.
   */
  validate: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as unknown;
    const manifest = validateManifest(body);
    return Response.json({ ok: true, manifest });
  }),

  /**
   * Uninstall an extension. Removes the dir and the DB row (scoped). Global
   * scope requires admin gate (consistent with install).
   */
  uninstall: errorGuard(
    withExtensionUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id?: string };
      if (!body?.id) {
        throw new ValidationError({ message: 'Missing id in body' });
      }
      const row = await getExtension(userId, body.id);
      if (!row) {
        throw new NotFoundError(`Extension "${body.id}"`);
      }
      if (row.scope === 'global') {
        requireAdminForGlobal();
      }
      await uninstallExtension(userId, body.id);
      return Response.json({ ok: true });
    }),
  ),

  /**
   * Pull latest from git for one extension. Updates manifestCache + lastUpdatedAt.
   */
  update: errorGuard(
    withExtensionUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id?: string };
      if (!body?.id) {
        throw new ValidationError({ message: 'Missing id in body' });
      }
      const row = await getExtension(userId, body.id);
      if (!row) {
        throw new NotFoundError(`Extension "${body.id}"`);
      }
      if (row.scope === 'global') {
        requireAdminForGlobal();
      }
      const result = await updateExtension(userId, body.id);
      return Response.json({ ok: true, extension: result });
    }),
  ),

  /**
   * Pull latest for every git-backed extension visible to the user. Returns
   * arrays of updated ids and per-extension failures (best-effort).
   */
  updateAll: errorGuard(
    withExtensionUserId(async (_req: Request, userId: string): Promise<Response> => {
      const results = await updateAllExtensions(userId);
      return Response.json({ ok: true, ...results });
    }),
  ),

  /**
   * Enable an extension (toggle enabled=true).
   */
  enable: errorGuard(
    withExtensionUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id?: string };
      if (!body?.id) {
        throw new ValidationError({ message: 'Missing id in body' });
      }
      const row = await getExtension(userId, body.id);
      if (!row) {
        throw new NotFoundError(`Extension "${body.id}"`);
      }
      const updated = await toggleExtension(userId, body.id, true);
      return Response.json({ ok: true, extension: updated });
    }),
  ),

  /**
   * Disable an extension (toggle enabled=false).
   */
  disable: errorGuard(
    withExtensionUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id?: string };
      if (!body?.id) {
        throw new ValidationError({ message: 'Missing id in body' });
      }
      const row = await getExtension(userId, body.id);
      if (!row) {
        throw new NotFoundError(`Extension "${body.id}"`);
      }
      const updated = await toggleExtension(userId, body.id, false);
      return Response.json({ ok: true, extension: updated });
    }),
  ),

  /**
   * Patch a single settings key. Idempotent merge with existing settings.
   * Body: { id: string, key: string, value: unknown }.
   */
  patchSettings: errorGuard(
    withExtensionUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as { id?: string } & Record<string, unknown>;
      if (!body?.id) {
        throw new ValidationError({ message: 'Missing id in body' });
      }
      const parsed = SettingsPatchSchema.safeParse({
        key: body.key,
        value: body.value,
      });
      if (!parsed.success) {
        throw new ValidationError(parsed.error.flatten());
      }
      await patchSettings(userId, body.id, parsed.data.key, parsed.data.value);
      const settings = await getSettings(userId, body.id);
      return Response.json({ ok: true, settings });
    }),
  ),

  /**
   * Get full settings object for an extension.
   */
  getSettings: errorGuard(
    withExtensionUserId(async (req: Request, userId: string): Promise<Response> => {
      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      if (!id) {
        throw new ValidationError({ message: 'Missing id query parameter' });
      }
      const settings = await getSettings(userId, id);
      return Response.json({ ok: true, settings });
    }),
  ),

  /**
   * Serve an asset (JS/CSS/png/etc) from a user-visible extension's on-disk
   * dir. Path traversal protected by `safeExtensionPath`.
   *
   * Called from `app.ts` for inbound `/api/v1/extensions/assets/{extId}/{relPath}`
   * URLs. The route is mounted via pattern match — the handler itself parses
   * the URL and resolves the directory based on the user's resolved extension
   * list (local-wins for collisions between user + global rows of same id).
   *
   * Returns 404 for unknown ext ids, missing files, or path-traversal attempts.
   * JS / CSS are sent with no `Content-Security-Policy` to allow browser execute.
   * All other asset types use `securityHeaders` for defense in depth.
   */
  serveAsset: errorGuard(
    withExtensionUserId(async (req: Request, userId: string): Promise<Response> => {
      const url = new URL(req.url);
      const pathname = url.pathname;
      if (!pathname.startsWith(ASSET_PREFIX)) {
        throw new NotFoundError('Asset path');
      }
      const rest = pathname.slice(ASSET_PREFIX.length);
      const slashIdx = rest.indexOf('/');
      if (slashIdx < 0) {
        throw new NotFoundError('Asset path');
      }
      const extId = rest.slice(0, slashIdx);
      const relPath = rest.slice(slashIdx + 1);
      if (!relPath || !/^[a-z0-9-]+$/.test(extId)) {
        throw new NotFoundError('Asset path');
      }

      const dir = await resolveExtDir(userId, extId);
      if (!dir) {
        throw new NotFoundError(`Extension "${extId}"`);
      }

      const built = resolveBuiltAsset(extId, relPath);
      if (built) {
        const headers: Record<string, string> = {
          'Content-Type': built.contentType,
          'Cache-Control': 'no-cache',
          'X-Content-Type-Options': 'nosniff',
        };
        return new Response(Bun.file(built.abs), { headers });
      }

      const safeAbs = safeExtensionPath(dir, relPath);
      const file = Bun.file(safeAbs);
      if (!(await file.exists())) {
        throw new NotFoundError('Asset');
      }
      const contentType = resolveMimeType(safeAbs);
      const isScript = contentType === 'application/javascript';
      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      };
      if (isScript) {
        headers['X-Content-Type-Options'] = 'nosniff';
      } else {
        Object.assign(headers, securityHeaders);
      }
      return new Response(file, { headers });
    }),
  ),
};
