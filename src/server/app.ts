import { serve, type Server } from 'bun';
import path from 'node:path';
import { isOnboardingNeeded } from './config';
import { buildApiRoutes } from './routes';
import { safePathWithin } from './util/safePath';
import { securityHeaders } from './errors';
import { resolveMimeType } from './mime';
import { SHARED_CONST } from '@/shared/constants';
import { log } from './logger';
import { reqLogMiddleware } from './middleware/reqLog';

log.info('boot', 'Starting WorldCore...');

const needsOnboarding = isOnboardingNeeded();

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';
log.info('boot', `Config: port=${PORT} host=${HOST} onboarding=${needsOnboarding}`);

const distDir = path.join(process.cwd(), 'dist');
const distHtml = Bun.file(path.join(distDir, 'index.html'));
const htmlContent = await distHtml.text();
log.info('boot', 'Loaded frontend bundle');

const apiRoutes = buildApiRoutes();
log.info('boot', `Registered ${Object.keys(apiRoutes).length} API routes`);

const { runMigrations } = await import('./db/migrate');
const { ensureUserDirs, ensureGlobalExtensionRoot } = await import('./storage/paths');
const { setStartFn } = await import('./routes/onboarding.routes');
const { seedPreinstalledGlobalExtensions } = await import('./services/extensions.service');

log.info('boot', 'Running database migrations...');
runMigrations();
log.info('boot', 'Database migrations completed');

log.info('boot', 'Ensuring user directories...');
ensureUserDirs();
log.info('boot', 'User directories ready');

log.info('boot', 'Ensuring global extension root...');
ensureGlobalExtensionRoot();
log.info('boot', 'Global extension root ready');

log.info('boot', 'Seeding preinstalled extensions...');
await seedPreinstalledGlobalExtensions();
log.info('boot', 'Preinstalled extensions seeded');

let stopWatcher: (() => Promise<void>) | null = null;

export async function start(): Promise<void> {
  const { startCharacterWatcher, stopCharacterWatcher } =
    await import('./services/character-watcher');
  const { presetService } = await import('./services/preset.service');

  log.info('boot', 'Starting character watcher...');
  startCharacterWatcher();
  stopWatcher = stopCharacterWatcher;
  log.info('boot', 'Character watcher started');

  log.info('boot', 'Seeding default presets...');
  await presetService.seedDefaults();
  log.info('boot', 'Default presets seeded');
}

setStartFn(start);

if (!needsOnboarding) {
  await start();
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    if (pathname.startsWith(`${SHARED_CONST.API_VERSION_PREFIX}/extensions/assets/`)) {
      const assetHandler = apiRoutes[`${SHARED_CONST.API_VERSION_PREFIX}/extensions/asset`];
      if (assetHandler) {
        return assetHandler(req);
      }
    }
    if (pathname === `${SHARED_CONST.API_VERSION_PREFIX}/models/context`) {
      const contextHandler = apiRoutes[`${SHARED_CONST.API_VERSION_PREFIX}/models/context`];
      if (contextHandler) {
        return contextHandler(req);
      }
    }
    if (pathname.startsWith(`${SHARED_CONST.API_VERSION_PREFIX}/models/`)) {
      const modelsHandler = apiRoutes[`${SHARED_CONST.API_VERSION_PREFIX}/models`];
      if (modelsHandler) {
        return modelsHandler(req);
      }
    }
    const handler = apiRoutes[pathname];
    if (handler) {
      return handler(req);
    }
    return Response.json(
      { error: { code: 'NOT_FOUND', message: `Route not found: ${pathname}` } },
      { status: 404, headers: securityHeaders },
    );
  }

  const userPath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const safePath = safePathWithin(distDir, userPath);
  if (!safePath) {
    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        ...securityHeaders,
      },
      status: 404,
    });
  }
  const file = Bun.file(safePath);
  if (await file.exists()) {
    return new Response(file.stream(), {
      headers: {
        'Content-Type': resolveMimeType(safePath),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        ...securityHeaders,
      },
    });
  }

  return new Response(htmlContent, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      ...securityHeaders,
    },
  });
}

const server = serve({
  port: PORT,
  hostname: HOST,
  idleTimeout: 0,
  fetch: reqLogMiddleware(handleRequest),
});

log.info('boot', `Server listening at ${server.url}`);

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info('shutdown', `Received ${signal}, shutting down...`);
  if (stopWatcher) {
    log.info('shutdown', 'Stopping character watcher...');
    await stopWatcher();
  }
  server.stop();
  log.info('shutdown', 'Server stopped');
  process.exit(0);
}

const g = globalThis as Record<string, unknown>;
if (!g.__app_shutdown_registered) {
  g.__app_shutdown_registered = true;
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

export default server;
