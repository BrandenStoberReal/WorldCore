import { useRef, useEffect, lazy, Suspense, useCallback, createContext, useContext, useMemo } from 'react';
import { Users } from 'lucide-react';
import { DrawerSlot } from './DrawerSlot';
import { NavRail } from './NavRail';
import { CenterPageHost } from './CenterPageHost';
import { MobileBottomNav } from './MobileBottomNav';
import { DeviceGuard } from '@/components/Responsive';
import { useNavStore } from '@/lib/navStore';
import { useChatStore, useAppStore } from '@/lib/stores';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { CharacterSelector } from '@/components/CharacterSelector';
import { DragDropOverlay } from '@/components/DragDropOverlay';
import { ExtensionPanelSlot } from '@/lib/extensionSlots';
import { cn } from '@/lib/utils';

const WORLDINFO_IMPORT = () => import('@/panels/WorldInfoPanel');
const EXTENSIONS_IMPORT = () => import('@/panels/ExtensionsPanel');
const CONNECTIONS_IMPORT = () => import('@/panels/ConnectionsPanel');
const TEXTOPTIONS_IMPORT = () => import('@/panels/TextOptionsPanel');
const SETTINGS_IMPORT = () => import('@/panels/SettingsPanel');
const UI_SETTINGS_IMPORT = () => import('@/panels/UISettingsPanel');
const PERSONAS_IMPORT = () => import('@/panels/persona/PersonaPanel');
const GENERATION_IMPORT = () => import('@/panels/GenerationPanel');
const OUTFIT_IMPORT = () => import('@/panels/OutfitPanel').then((m) => ({ default: m.OutfitPanel }));

const WorldInfoPanel = lazy(WORLDINFO_IMPORT);
const ExtensionsPanel = lazy(EXTENSIONS_IMPORT);
const ConnectionsPanel = lazy(CONNECTIONS_IMPORT);
const TextOptionsPanel = lazy(TEXTOPTIONS_IMPORT);
const SettingsPanel = lazy(SETTINGS_IMPORT);
const UISettingsPanel = lazy(UI_SETTINGS_IMPORT);
const PersonaPanel = lazy(PERSONAS_IMPORT);
const GenerationPanel = lazy(GENERATION_IMPORT);
const OutfitPanel = lazy(OUTFIT_IMPORT);

const PREFETCH_MAP: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  worldinfo: WORLDINFO_IMPORT,
  extensions: EXTENSIONS_IMPORT,
  connections: CONNECTIONS_IMPORT,
  textoptions: TEXTOPTIONS_IMPORT,
  settings: SETTINGS_IMPORT,
  'ui-settings': UI_SETTINGS_IMPORT,
  personas: PERSONAS_IMPORT,
  generation: GENERATION_IMPORT,
  outfit: OUTFIT_IMPORT,
};

const TOP_DRAWER_PANELS: Record<string, React.ComponentType> = {
  worldinfo: WorldInfoPanel,
  extensions: ExtensionsPanel,
  connections: ConnectionsPanel,
  textoptions: TextOptionsPanel,
  'ui-settings': UISettingsPanel,
  settings: SettingsPanel,
  personas: PersonaPanel,
  outfit: OutfitPanel,
};

/**
 * Prefetch context — DrawerIcon calls prefetch(sectionId) on mouseenter
 * so the lazy component starts loading before the user clicks.
 */
export const PrefetchContext = createContext<(id: string) => void>(() => {});

function CharactersSidebar() {
  const activeCharacterId = useChatStore((s) => s.activeCharacterId);
  const setActiveCharacter = useChatStore((s) => s.setActiveCharacter);
  const toggleCharacters = useNavStore((s) => s.toggleCharacters);
  const { isMobile } = useBreakpoint();

  function handleSelect(id: number) {
    setActiveCharacter(id);
    if (isMobile) toggleCharacters();
  }

  return (
    <CharacterSelector
      selectedId={activeCharacterId}
      onSelect={handleSelect}
      onToggle={toggleCharacters}
    />
  );
}

function CharactersPanel() {
  const charactersOpen = useNavStore((s) => s.charactersOpen);
  const toggleCharacters = useNavStore((s) => s.toggleCharacters);
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return (
      <>
        {charactersOpen && (
          <div className="fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={toggleCharacters}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 w-full">
              <div className="bg-background h-full overflow-y-auto shadow-xl">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <span className="font-medium">Characters</span>
                  <button
                    type="button"
                    onClick={toggleCharacters}
                    className="hover:bg-muted rounded-lg p-2 transition-colors"
                    aria-label="Close characters"
                  >
                    <Users className="h-5 w-5" />
                  </button>
                </div>
                <CharactersSidebar />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="relative flex shrink-0">
      <DrawerSlot direction="characters" open={charactersOpen}>
        <CharactersSidebar />
      </DrawerSlot>

      {!charactersOpen && (
        <button
          type="button"
          onClick={toggleCharacters}
          className={cn(
            'border-border bg-background/60 hover:bg-accent/40 text-foreground/40 hover:text-ember',
            'flex h-12 w-3 items-center justify-center rounded-l-md border-y border-l',
            'backdrop-blur-sm transition-all duration-200',
          )}
          title="Show characters"
          aria-label="Show characters"
        >
          <Users className="h-3 w-3" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

export function DrawerShell() {
  const topDrawer = useNavStore((s) => s.topDrawer);
  const genSidebarOpen = useNavStore((s) => s.genSidebarOpen);
  const toggleGenSidebar = useNavStore((s) => s.toggleGenSidebar);
  const charactersOpen = useNavStore((s) => s.charactersOpen);
  const mobileNavPosition = useAppStore((s) => s.mobileNavPosition);
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    if (!isMobile) return;
    const anyOverlayOpen = charactersOpen || genSidebarOpen;
    if (anyOverlayOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, charactersOpen, genSidebarOpen]);

  const lastTopPanelRef = useRef<React.ComponentType | null>(null);
  const CurrentTopPanel = topDrawer ? TOP_DRAWER_PANELS[topDrawer] : null;
  if (CurrentTopPanel) lastTopPanelRef.current = CurrentTopPanel;
  const TopPanel = CurrentTopPanel ?? lastTopPanelRef.current;

  const prefetch = useCallback((id: string) => {
    PREFETCH_MAP[id]?.();
  }, []);

  const prefetchValue = useMemo(() => prefetch, [prefetch]);

  return (
    <PrefetchContext.Provider value={prefetchValue}>
      <div data-drawer-shell className="bg-background flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
        <DragDropOverlay />
        <NavRail />

      <DrawerSlot direction="top" open={topDrawer !== null}>
        {TopPanel && (
          <Suspense fallback={null}>
            <TopPanel />
          </Suspense>
        )}
        <ExtensionPanelSlot target="top-drawer" />
      </DrawerSlot>

      {/* Mobile top navigation */}
      {mobileNavPosition === 'top' && (
        <DeviceGuard mobile>
          <MobileBottomNav genSidebarOpen={genSidebarOpen} onToggleGenSidebar={toggleGenSidebar} position="top" />
        </DeviceGuard>
      )}

      <div
        className={cn(
          'relative flex-1 overflow-hidden',
          isMobile ? 'flex flex-col' : 'flex flex-row',
        )}
      >
        <DeviceGuard desktop>
          <Suspense fallback={null}>
            <GenerationPanel closed={!genSidebarOpen} onToggle={toggleGenSidebar} />
          </Suspense>
        </DeviceGuard>
        <CenterPageHost />
        <CharactersPanel />
      </div>

      {/* Mobile bottom navigation */}
      {mobileNavPosition === 'bottom' && (
        <DeviceGuard mobile>
          <MobileBottomNav genSidebarOpen={genSidebarOpen} onToggleGenSidebar={toggleGenSidebar} position="bottom" />
        </DeviceGuard>
      )}
      </div>
    </PrefetchContext.Provider>
  );
}
