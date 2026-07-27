import type { Manifest, ExtensionRow } from '@/shared/types/extensions';
import type { WorldCoreAPI } from '@/shared/types/worldcore-api';
import { SHARED_CONST } from '@/shared/constants';
import { ManifestSchema } from '@/shared/schemas/extensions';
import { clearExtension } from '@/lib/extensionRegistry';
import { extensionEventBus } from '@/lib/extensionEventBus';
import { createWorldCoreApi } from '@/lib/worldcoreApi';

const PREFIX = SHARED_CONST.API_VERSION_PREFIX;
const ASSET_PATH_PREFIX = `${PREFIX}/extensions/assets`;
const ACTIVATE_TIMEOUT_MS = 5000;

export interface LoadResult {
  row: ExtensionRow;
  status: 'activated' | 'timeout' | 'failed';
  error?: string;
}

interface InflightActivation {
  resolve: () => void;
  reject: (err: Error) => void;
}

const inflightActivations = new Map<string, InflightActivation>();
const loadedScripts = new Map<string, HTMLScriptElement>();
const loadedStylesheets = new Map<string, HTMLLinkElement>();

export function assetUrl(extId: string, relPath: string): string {
  return `${ASSET_PATH_PREFIX}/${extId}/${relPath}`;
}

export function getManifest(row: ExtensionRow): Manifest | null {
  if (!row.manifestCache || typeof row.manifestCache !== 'object') return null;
  const parsed = ManifestSchema.safeParse(row.manifestCache);
  if (!parsed.success) {
    console.warn(
      `[worldcore-ext] invalid manifest_cache for "${row.id}":`,
      parsed.error.issues[0]?.message,
    );
    return null;
  }
  return parsed.data as Manifest;
}

function injectScript(extId: string, jsPath: string): HTMLScriptElement {
  const script = document.createElement('script');
  script.type = 'module';
  script.dataset.worldcoreExt = extId;
  script.src = assetUrl(extId, jsPath);
  document.head.appendChild(script);
  return script;
}

function injectStylesheet(extId: string, cssPath: string): HTMLLinkElement {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.dataset.worldcoreExt = extId;
  link.href = assetUrl(extId, cssPath);
  document.head.appendChild(link);
  return link;
}

function removeNode(node: HTMLElement | null): void {
  if (node && node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

/**
 * Triggered by the extension script via `globalThis.__WorldCore_activate__(extId)`
 * once it has finished registering panels/slots with the WorldCore API.
 * Resolves the inflight activation promise.
 */
export function signalActivated(extId: string): void {
  const inflight = inflightActivations.get(extId);
  if (!inflight) return;
  inflightActivations.delete(extId);
  inflight.resolve();
}

export async function loadExtension(row: ExtensionRow): Promise<LoadResult> {
  if (!row.enabled) {
    return { row, status: 'failed', error: 'extension not enabled' };
  }
  const manifest = getManifest(row);
  if (!manifest) {
    return { row, status: 'failed', error: 'missing manifest cache' };
  }

  if (manifest.css) {
    const link = injectStylesheet(row.id, manifest.css);
    loadedStylesheets.set(row.id, link);
  }

  const api: WorldCoreAPI = createWorldCoreApi({
    extId: row.id,
    version: row.version,
    scope: row.scope,
  });

  const g = globalThis as Record<string, unknown>;
  g.WorldCore = api;

  let status: LoadResult['status'] = 'activated';
  let errorMsg: string | undefined;
  try {
    await raceActivation(row.id, () => {
      const script = injectScript(row.id, manifest.js);
      loadedScripts.set(row.id, script);
    });
    extensionEventBus.emit('ext_installed', { id: row.id });
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : String(err);
    status = errorMsg.includes('timeout') ? 'timeout' : 'failed';
    console.warn(`[worldcore-ext] activate failed for "${row.id}":`, errorMsg);
  }

  return { row, status, error: errorMsg };
}

function raceActivation(extId: string, inject: () => void): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      inflightActivations.delete(extId);
      reject(new Error(`activate timeout after ${ACTIVATE_TIMEOUT_MS}ms`));
    }, ACTIVATE_TIMEOUT_MS);

    inflightActivations.set(extId, {
      resolve: () => {
        clearTimeout(timer);
        resolve();
      },
      reject: (err: Error) => {
        clearTimeout(timer);
        reject(err);
      },
    });

    try {
      inject();
    } catch (err) {
      clearTimeout(timer);
      inflightActivations.delete(extId);
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export async function loadAllExtensions(rows: ExtensionRow[]): Promise<LoadResult[]> {
  const sorted = [...rows]
    .filter((r) => r.enabled)
    .sort((a, b) => {
      const oa = getManifest(a)?.loadingOrder ?? 100;
      const ob = getManifest(b)?.loadingOrder ?? 100;
      return oa - ob;
    });
  const results: LoadResult[] = [];
  for (const row of sorted) {
    results.push(await loadExtension(row));
  }
  return results;
}

export function unloadExtension(extId: string): void {
  const script = loadedScripts.get(extId);
  const link = loadedStylesheets.get(extId);
  removeNode(script ?? null);
  removeNode(link ?? null);
  loadedScripts.delete(extId);
  loadedStylesheets.delete(extId);
  clearExtension(extId);
  extensionEventBus.emit('ext_uninstalled', { id: extId });
}

export function unloadAll(extensions: ExtensionRow[]): void {
  for (const row of extensions) {
    unloadExtension(row.id);
  }
}

export function installActivationSdk(): void {
  Object.defineProperty(globalThis, '__WorldCore_activate__', {
    value: signalActivated,
    writable: false,
    configurable: false,
  });
}
