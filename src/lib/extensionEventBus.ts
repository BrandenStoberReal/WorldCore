import type { WorldCoreEventTypes } from '@/shared/types/worldcore-api';

type Handler = (payload: unknown) => void;

const listeners = new Map<WorldCoreEventTypes, Set<Handler>>();
const extListeners = new Map<string, (() => void)[]>();

export function on(type: WorldCoreEventTypes, handler: Handler): () => void {
  let set = listeners.get(type);
  if (!set) {
    set = new Set();
    listeners.set(type, set);
  }
  set.add(handler);
  return () => {
    set!.delete(handler);
  };
}

export function onForExt(extId: string, type: WorldCoreEventTypes, handler: Handler): () => void {
  const unsub = on(type, handler);
  let list = extListeners.get(extId);
  if (!list) {
    list = [];
    extListeners.set(extId, list);
  }
  list.push(unsub);
  return unsub;
}

export function off(type: WorldCoreEventTypes, handler: (payload: unknown) => void): void {
  const set = listeners.get(type);
  if (!set) return;
  set.delete(handler as Handler);
}

export function clearExtListeners(extId: string): void {
  const list = extListeners.get(extId);
  if (!list) return;
  for (const unsub of list) {
    unsub();
  }
  extListeners.delete(extId);
}

export function emit(type: WorldCoreEventTypes, payload?: unknown): void {
  const set = listeners.get(type);
  if (!set) return;
  for (const handler of set) {
    try {
      handler(payload);
    } catch (err) {
      console.error(`[worldcore-ext] event handler error for "${type}":`, err);
    }
  }
}

export const types: Record<WorldCoreEventTypes, WorldCoreEventTypes> = {
  ext_installed: 'ext_installed',
  ext_uninstalled: 'ext_uninstalled',
  ext_enabled: 'ext_enabled',
  ext_disabled: 'ext_disabled',
  chat_changed: 'chat_changed',
  character_changed: 'character_changed',
  settings_changed: 'settings_changed',
  generation_started: 'generation_started',
  generation_stopped: 'generation_stopped',
  message_updated: 'message_updated',
  message_removed: 'message_removed',
  message_chunk_received: 'message_chunk_received',
  new_message: 'new_message',
  user_initialized: 'user_initialized',
  viewport_changed: 'viewport_changed',
  top_drawer_changed: 'top_drawer_changed',
  character_import: 'character_import',
};

export const extensionEventBus = { on, off, emit, types };
