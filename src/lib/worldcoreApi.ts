import type React from 'react';
import * as ReactImport from 'react';
import type { WorldCoreAPI, WorldCoreStores, WorldCoreHelpers } from '@/shared/types/worldcore-api';
import {
  registerPanel,
  unregisterPanel,
  registerSlot,
  unregisterSlot,
  registerSlashCommand,
  unregisterSlashCommand,
} from '@/lib/extensionRegistry';
import {
  registerCardSource as registerCardSourceImpl,
  unregisterCardSource as unregisterCardSourceImpl,
} from '@/lib/cardSourceRegistry';
import {
  registerGenerationInterceptor as registerGenerationInterceptorImpl,
  unregisterGenerationInterceptor as unregisterGenerationInterceptorImpl,
} from '@/lib/generationInterceptorRegistry';
import { apiFetch, apiGet, apiPost } from '@/lib/api';
import type { Character, ShallowCharacter } from '@/shared/types/character';
import type { ChatMessage } from '@/shared/types/chat';
import { queryClient } from '@/lib/queryClient';
import { toastError, toastSuccess, toastInfo } from '@/lib/toast';
import { extensionEventBus } from '@/lib/extensionEventBus';
import { useAppStore, useGenerationStore, useChatStore } from '@/lib/stores';
import { useNavStore } from '@/lib/navStore';
import {
  cn,
  ambientGlow,
  frostedGlass,
  surfaceCard,
  subtleEdge,
  elevatedCard,
  springTransition,
} from '@/lib/utils';
import * as Button from '@/components/ui/button';
import * as Card from '@/components/ui/card';
import * as Alert from '@/components/ui/alert';
import * as Input from '@/components/ui/input';
import * as Label from '@/components/ui/label';
import * as Select from '@/components/ui/select';
import * as Textarea from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { PanelHeader } from '@/components/ui/panel-header';
import { SectionLabel } from '@/components/ui/section-label';
import { Divider } from '@/components/ui/divider';
import { IconButton } from '@/components/ui/icon-button';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import * as lucideReact from 'lucide-react';

export interface CreateWorldCoreApiOptions {
  extId: string;
  version: string;
  scope: 'user' | 'global';
}

const SETTINGS_PANEL_ID = 'worldcore-extension-settings-panel';

const stylesheetRegistry = new Map<string, HTMLLinkElement>();
const settingsPanelRegistry = new Map<string, React.FC>();

function noop(): void {}

function makeLogger(extId: string): WorldCoreAPI['logger'] {
  const make = (ns: string) => ({
    log: (...args: unknown[]): void => console.log(`[worldcore-ext:${extId}:${ns}]`, ...args),
    warn: (...args: unknown[]): void =>
      console.warn(`[worldcore-ext:${extId}:${ns}] WARN`, ...args),
    error: (...args: unknown[]): void =>
      console.error(`[worldcore-ext:${extId}:${ns}] ERROR`, ...args),
  });
  return { namespace: make };
}

const settingsRegistry = new Map<string, Record<string, unknown>>();
const settingsDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function getSettingsStore(extId: string): Record<string, unknown> {
  let store = settingsRegistry.get(extId);
  if (!store) {
    store = {};
    settingsRegistry.set(extId, store);
  }
  return store;
}

async function setSetting(extId: string, key: string, value: unknown): Promise<void> {
  const store = getSettingsStore(extId);
  store[key] = value;
  const existing = settingsDebounceTimers.get(extId);
  if (existing) clearTimeout(existing);
  await new Promise<void>((resolve) => {
    const timer = setTimeout(async () => {
      settingsDebounceTimers.delete(extId);
      try {
        await apiFetch('/api/v1/extensions/patch-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: extId, key, value }),
        });
        extensionEventBus.emit('settings_changed', { extId, key });
      } catch (err) {
        console.error(`[worldcore-ext:${extId}] settings.set failed:`, err);
      }
      resolve();
    }, 500);
    settingsDebounceTimers.set(extId, timer);
  });
}

function getSetting<T>(extId: string, key: string): T | undefined {
  return getSettingsStore(extId)[key] as T | undefined;
}

function makeStores(): WorldCoreStores {
  return {
    app: {
      getState: () => useAppStore.getState(),
      subscribe: (cb) => useAppStore.subscribe((state) => cb(state)),
    },
    generation: {
      getState: () => useGenerationStore.getState(),
      subscribe: (cb) => useGenerationStore.subscribe((state) => cb(state)),
    },
    chat: {
      getState: () => useChatStore.getState(),
      subscribe: (cb) => useChatStore.subscribe((state) => cb(state)),
    },
  };
}

function assertRelativePath(path: string): void {
  if (/^https?:\/\//i.test(path)) {
    throw new Error(`extensions may not call absolute URLs via the WorldCore API: ${path}`);
  }
}

function scopedApiFetch(path: string, options?: RequestInit): Promise<unknown> {
  assertRelativePath(path);
  return apiFetch(path, options);
}

function scopedApiGet<T>(path: string): Promise<T> {
  assertRelativePath(path);
  return apiGet<T>(path);
}

function scopedApiPost<T>(path: string, body?: unknown): Promise<T> {
  assertRelativePath(path);
  return apiPost<T>(path, body);
}

export function createWorldCoreApi(opts: CreateWorldCoreApiOptions): WorldCoreAPI {
  const { extId, version, scope } = opts;
  const stores = makeStores();
  const logger = makeLogger(extId);

  return {
    meta: { extId, version, scope },
    registerPanel: (opts) => {
      registerPanel({
        id: opts.id,
        target: opts.target,
        component: opts.component,
        navIcon: opts.navIcon,
        navLabel: opts.navLabel,
        loadingOrder: opts.loadingOrder,
        extId,
      });
    },
    unregisterPanel: (id) => unregisterPanel(id),
    registerSlot: (slotId, component) => registerSlot(slotId, component, extId),
    unregisterSlot: (slotId, component) => unregisterSlot(slotId, component),
    stores,
    queryClient,
    apiGet: scopedApiGet,
    apiPost: scopedApiPost,
    apiFetch: scopedApiFetch,
    toast: {
      success: (m: string) => toastSuccess(m),
      error: (m: string) => toastError(new Error(m)),
      info: (m: string) => toastInfo(m),
    },
    settings: {
      get: <T>(key: string): T | undefined => getSetting<T>(extId, key),
      set: (key: string, value: unknown) => setSetting(extId, key, value),
    },
    events: {
      on: (type, handler) => extensionEventBus.on(type, handler),
      off: (type, handler) => extensionEventBus.off(type, handler),
      emit: (type, payload) => extensionEventBus.emit(type, payload),
      types: extensionEventBus.types,
    },
    components: {
      Button: Button.Button,
      buttonVariants: Button.buttonVariants,
      Card: Card.Card,
      CardAction: Card.CardAction,
      CardContent: Card.CardContent,
      CardDescription: Card.CardDescription,
      CardFooter: Card.CardFooter,
      CardHeader: Card.CardHeader,
      CardTitle: Card.CardTitle,
      Alert: Alert.Alert,
      Input: Input.Input,
      Label: Label.Label,
      Select: Select.Select,
      SelectContent: Select.SelectContent,
      SelectGroup: Select.SelectGroup,
      SelectItem: Select.SelectItem,
      SelectLabel: Select.SelectLabel,
      SelectScrollDownButton: Select.SelectScrollDownButton,
      SelectScrollUpButton: Select.SelectScrollUpButton,
      SelectSeparator: Select.SelectSeparator,
      SelectTrigger: Select.SelectTrigger,
      SelectValue: Select.SelectValue,
      Textarea: Textarea.Textarea,
      LoadingSpinner,
      EmptyState,
      PageHeader,
      PanelHeader,
      SectionLabel,
      Divider,
      IconButton,
      Modal,
      ConfirmDialog,
    },
    ui: {
      cn,
      tokens: {
        ambientGlow,
        frostedGlass,
        surfaceCard,
        subtleEdge,
        elevatedCard,
        springTransition,
      },
      icons: lucideReact,
    },
    registerSlashCommand: (name, handler, description) =>
      registerSlashCommand(name, handler, extId, description),
    unregisterSlashCommand: (name) => unregisterSlashCommand(name),
    logger,
    react: ReactImport,
    registerSettingsPanel: (component) => {
      settingsPanelRegistry.set(extId, component);
      slotEventBusEmit(SETTINGS_PANEL_ID);
    },
    unregisterSettingsPanel: () => {
      settingsPanelRegistry.delete(extId);
      slotEventBusEmit(SETTINGS_PANEL_ID);
    },
    registerStylesheet: (href) => {
      if (stylesheetRegistry.has(href)) return;
      if (typeof document === 'undefined') return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.dataset.worldcoreExt = extId;
      link.href = href;
      document.head.appendChild(link);
      stylesheetRegistry.set(href, link);
    },
    registerCardSource: (source) => {
      registerCardSourceImpl(source, extId);
    },
    unregisterCardSource: (sourceId) => {
      unregisterCardSourceImpl(sourceId);
    },
    registerGenerationInterceptor: (id, handler) => {
      registerGenerationInterceptorImpl(id, handler, extId);
    },
    unregisterGenerationInterceptor: (id) => {
      unregisterGenerationInterceptorImpl(id);
    },
    helpers: {
      characters: {
        list: () => scopedApiGet<ShallowCharacter[]>('/characters/all'),
        get: (id) => scopedApiPost<Character>('/characters/get', { id }),
        getActive: () => useChatStore.getState().activeCharacterId,
        setActive: (id) => useChatStore.getState().setActiveCharacter(id),
      },
      chat: {
        getActiveId: () => useChatStore.getState().activeChatId,
        setActiveId: (id) => useChatStore.getState().setActiveChat(id),
        getMessages: () => useChatStore.getState().messages,
      },
      navigation: {
        openSection: (id) => useNavStore.getState().openSection(id),
        openTopDrawer: (id) => useNavStore.getState().openTopDrawer(id),
        closeTopDrawer: () => useNavStore.getState().closeTopDrawer(),
      },
      user: {
        get: () => {
          const u = useAppStore.getState().user;
          return u ? { id: u.id, name: u.name, role: u.role } : null;
        },
      },
    } satisfies WorldCoreHelpers,
  };
}

/**
 * Per-extId settings panels registered via `registerSettingsPanel`. Read by
 * <SettingsPanelsSlot/> in the Extensions panel to render the active extension's
 * settings UI. (W3.C consumes this.)
 */
export function getExtensionSettingsPanel(extId: string): React.FC | undefined {
  return settingsPanelRegistry.get(extId);
}

export function getRegisteredSettingsPanels(): { extId: string; component: React.FC }[] {
  return [...settingsPanelRegistry.entries()].map(([extId, component]) => ({
    extId,
    component,
  }));
}

const settingsPanelListeners = new Set<() => void>();

export function subscribeSettingsPanelChanges(cb: () => void): () => void {
  settingsPanelListeners.add(cb);
  return () => {
    settingsPanelListeners.delete(cb);
  };
}

function slotEventBusEmit(_slotId: string): void {
  for (const cb of settingsPanelListeners) cb();
}
