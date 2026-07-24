import { useRef } from 'react';
import { Users } from 'lucide-react';
import { DrawerSlot } from './DrawerSlot';
import { NavRail } from './NavRail';
import { CenterPageHost } from './CenterPageHost';
import { MobileBottomNav } from './MobileBottomNav';
import { useNavStore } from '@/lib/navStore';
import { useChatStore } from '@/lib/stores';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { CharacterSelector } from '@/components/CharacterSelector';
import { DragDropOverlay } from '@/components/DragDropOverlay';
import { WorldInfoPanel } from '@/panels/WorldInfoPanel';
import { ExtensionsPanel } from '@/panels/ExtensionsPanel';
import { ConnectionsPanel } from '@/panels/ConnectionsPanel';
import { TextOptionsPanel } from '@/panels/TextOptionsPanel';
import { SettingsPanel } from '@/panels/SettingsPanel';
import { UISettingsPanel } from '@/panels/UISettingsPanel';
import { PersonaPanel } from '@/panels/persona/PersonaPanel';
import { GenerationPanel } from '@/panels/GenerationPanel';
import { cn } from '@/lib/utils';

const TOP_DRAWER_PANELS: Record<string, React.ComponentType> = {
  worldinfo: WorldInfoPanel,
  extensions: ExtensionsPanel,
  connections: ConnectionsPanel,
  textoptions: TextOptionsPanel,
  'ui-settings': UISettingsPanel,
  settings: SettingsPanel,
  personas: PersonaPanel,
};

function CharactersSidebar() {
  const activeCharacterId = useChatStore((s) => s.activeCharacterId);
  const setActiveCharacter = useChatStore((s) => s.setActiveCharacter);
  const toggleCharacters = useNavStore((s) => s.toggleCharacters);
  return (
    <CharacterSelector
      selectedId={activeCharacterId}
      onSelect={setActiveCharacter}
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
  const { isMobile } = useBreakpoint();

  const lastTopPanelRef = useRef<React.ComponentType | null>(null);
  const CurrentTopPanel = topDrawer ? TOP_DRAWER_PANELS[topDrawer] : null;
  if (CurrentTopPanel) lastTopPanelRef.current = CurrentTopPanel;
  const TopPanel = CurrentTopPanel ?? lastTopPanelRef.current;

  return (
    <div data-drawer-shell className="bg-background flex h-screen flex-col overflow-hidden">
      <DragDropOverlay />
      <NavRail />

      <DrawerSlot direction="top" open={topDrawer !== null}>
        {TopPanel && <TopPanel />}
      </DrawerSlot>

      <div
        className={cn(
          'relative flex-1 overflow-hidden',
          isMobile ? 'flex flex-col' : 'flex flex-row',
        )}
      >
        {!isMobile && <GenerationPanel closed={!genSidebarOpen} onToggle={toggleGenSidebar} />}
        <CenterPageHost />
        {!isMobile && <CharactersPanel />}
      </div>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <MobileBottomNav genSidebarOpen={genSidebarOpen} onToggleGenSidebar={toggleGenSidebar} />
      )}
    </div>
  );
}
