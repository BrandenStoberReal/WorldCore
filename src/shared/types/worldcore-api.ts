import type { ClassValue } from 'clsx';
import type { AppStore, GenerationState, ChatStore } from '@/lib/stores';
import type { Character, ShallowCharacter, CardSource } from '@/shared/types/character';
import type { ChatMessage } from '@/shared/types/chat';
import type { SectionId, TopDrawerId } from '@/lib/navStore';
import type { StreamChatRequest } from '@/lib/api';

export type WorldCorePanelTarget = 'top-drawer' | 'center';

export type WorldCoreEventTypes =
  | 'ext_installed'
  | 'ext_uninstalled'
  | 'ext_enabled'
  | 'ext_disabled'
  | 'chat_changed'
  | 'character_changed'
  | 'settings_changed'
  | 'generation_started'
  | 'generation_stopped'
  | 'message_updated'
  | 'message_removed'
  | 'message_chunk_received'
  | 'new_message'
  | 'user_initialized'
  | 'viewport_changed'
  | 'top_drawer_changed'
  | 'character_import';

/**
 * Mutable context passed to a generation interceptor. Extensions mutate
 * `ctx.request` in place to rewrite the in-flight prompt + gen params for this
 * single generation only. Mutations are NEVER persisted to chat state, settings,
 * or the database — they are transit-time only.
 *
 * `ctx.id` is a stable opaque string for this generation, useful for
 * correlating events across the interceptor + the chunk_received lifecycle.
 *
 * `ctx.abort()` allows an interceptor to short-circuit the generation
 * entirely; the caller treats the response as user-cancelled.
 */
export interface WorldCoreGenerationContext {
  id: string;
  request: StreamChatRequest;
  abort: () => void;
}

export type GenerationInterceptorHandler = (
  ctx: WorldCoreGenerationContext,
) => void | Promise<void>;

export type WorldCoreSlotId =
  'chat-input-toolbar' | 'message-actions' | 'character-editor-sidebar' | 'generation-panel-bottom';

export interface RegisterPanelOptions {
  id: string;
  target: WorldCorePanelTarget;
  component: React.FC;
  navIcon?: React.ReactNode;
  navLabel?: string;
  loadingOrder?: number;
}

export interface WorldCoreStores {
  app: {
    getState(): AppStore;
    subscribe(cb: (state: AppStore) => void): () => void;
  };
  generation: {
    getState(): GenerationState;
    subscribe(cb: (state: GenerationState) => void): () => void;
  };
  chat: {
    getState(): ChatStore;
    subscribe(cb: (state: ChatStore) => void): () => void;
  };
}

export interface WorldCoreComponents {
  Button: typeof import('@/components/ui/button').Button;
  buttonVariants: typeof import('@/components/ui/button').buttonVariants;
  Card: typeof import('@/components/ui/card').Card;
  CardAction: typeof import('@/components/ui/card').CardAction;
  CardContent: typeof import('@/components/ui/card').CardContent;
  CardDescription: typeof import('@/components/ui/card').CardDescription;
  CardFooter: typeof import('@/components/ui/card').CardFooter;
  CardHeader: typeof import('@/components/ui/card').CardHeader;
  CardTitle: typeof import('@/components/ui/card').CardTitle;
  Alert: typeof import('@/components/ui/alert').Alert;
  Input: typeof import('@/components/ui/input').Input;
  Label: typeof import('@/components/ui/label').Label;
  Select: typeof import('@/components/ui/select').Select;
  SelectContent: typeof import('@/components/ui/select').SelectContent;
  SelectGroup: typeof import('@/components/ui/select').SelectGroup;
  SelectItem: typeof import('@/components/ui/select').SelectItem;
  SelectLabel: typeof import('@/components/ui/select').SelectLabel;
  SelectScrollDownButton: typeof import('@/components/ui/select').SelectScrollDownButton;
  SelectScrollUpButton: typeof import('@/components/ui/select').SelectScrollUpButton;
  SelectSeparator: typeof import('@/components/ui/select').SelectSeparator;
  SelectTrigger: typeof import('@/components/ui/select').SelectTrigger;
  SelectValue: typeof import('@/components/ui/select').SelectValue;
  Textarea: typeof import('@/components/ui/textarea').Textarea;
  LoadingSpinner: typeof import('@/components/ui/loading-spinner').LoadingSpinner;
  EmptyState: typeof import('@/components/ui/empty-state').EmptyState;
  PageHeader: typeof import('@/components/ui/page-header').PageHeader;
  PanelHeader: typeof import('@/components/ui/panel-header').PanelHeader;
  SectionLabel: typeof import('@/components/ui/section-label').SectionLabel;
  Divider: typeof import('@/components/ui/divider').Divider;
  IconButton: typeof import('@/components/ui/icon-button').IconButton;
  Modal: typeof import('@/components/Modal').Modal;
  ConfirmDialog: typeof import('@/components/ConfirmDialog').ConfirmDialog;
}

export interface WorldCoreUITokens {
  ambientGlow: string;
  frostedGlass: string;
  surfaceCard: string;
  subtleEdge: string;
  elevatedCard: string;
  springTransition: string;
}

export interface WorldCoreLogger {
  namespace(ns: string): {
    log(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
  };
}

export interface WorldCoreSettings {
  get<T>(key: string): T | undefined;
  set(key: string, value: unknown): Promise<void>;
}

export interface WorldCoreEvents {
  on(type: WorldCoreEventTypes, handler: (payload: unknown) => void): () => void;
  off(type: WorldCoreEventTypes, handler: (payload: unknown) => void): void;
  emit(type: WorldCoreEventTypes, payload?: unknown): void;
  types: Record<WorldCoreEventTypes, WorldCoreEventTypes>;
}

export interface WorldCoreToast {
  success(message: string): void;
  error(message: string): void;
  info(message: string): void;
}

export interface WorldCoreHelpers {
  characters: {
    list(): Promise<ShallowCharacter[]>;
    get(id: number): Promise<Character>;
    getActive(): number | null;
    setActive(id: number | null): void;
  };
  chat: {
    getActiveId(): string | null;
    setActiveId(id: string | null): void;
    getMessages(): ChatMessage[];
  };
  navigation: {
    openSection(id: SectionId): void;
    openTopDrawer(id: TopDrawerId): void;
    closeTopDrawer(): void;
  };
  user: {
    get(): { id: string; name: string; role: string } | null;
  };
}

export interface RegisterSettingsPanelOptions {
  component: React.FC;
}

export interface WorldCoreAPI {
  meta: { extId: string; version: string; scope: 'user' | 'global' };
  registerPanel(opts: RegisterPanelOptions): void;
  unregisterPanel(id: string): void;
  registerSlot(slotId: WorldCoreSlotId, component: React.FC): void;
  unregisterSlot(slotId: WorldCoreSlotId, component: React.FC): void;
  stores: WorldCoreStores;
  queryClient: import('@tanstack/react-query').QueryClient;
  apiGet<T>(path: string): Promise<T>;
  apiPost<T>(path: string, body?: unknown): Promise<T>;
  apiFetch(path: string, options?: RequestInit): Promise<unknown>;
  toast: WorldCoreToast;
  settings: WorldCoreSettings;
  events: WorldCoreEvents;
  components: WorldCoreComponents;
  ui: {
    cn: (...args: ClassValue[]) => string;
    tokens: WorldCoreUITokens;
    icons: typeof import('lucide-react');
  };
  registerSlashCommand(name: string, handler: (args: string) => void, description?: string): void;
  unregisterSlashCommand(name: string): void;
  logger: WorldCoreLogger;
  react: typeof import('react');
  registerSettingsPanel(component: React.FC): void;
  unregisterSettingsPanel(): void;
  registerStylesheet(href: string): void;
  registerCardSource(source: CardSource): void;
  unregisterCardSource(sourceId: string): void;
  registerGenerationInterceptor(id: string, handler: GenerationInterceptorHandler): void;
  unregisterGenerationInterceptor(id: string): void;
  helpers: WorldCoreHelpers;
}
