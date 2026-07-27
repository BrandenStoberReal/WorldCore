import { ForbiddenError } from '@/server/errors';

/**
 * Admin gate for global extension installs. Global installs share a single
 * `data/extensions/{extId}/` directory across all users, so they require
 * explicit opt-in via the `WORLDCORE_ALLOW_ADMIN_GLOBAL_INSTALL=1` env var.
 *
 * Per AGENTS.md: per-user is the default; global is only for preinstalled
 * extensions. This gate prevents accidental privilege creep via git URLs.
 */
export function isGlobalInstallAllowed(): boolean {
  return process.env.WORLDCORE_ALLOW_ADMIN_GLOBAL_INSTALL === '1';
}

/**
 * Throws `ForbiddenError` when global installs are not explicitly enabled.
 * Call from route handlers before resolving `scope: 'global'`.
 */
export function requireAdminForGlobal(): void {
  if (!isGlobalInstallAllowed()) {
    throw new ForbiddenError();
  }
}
