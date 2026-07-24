import { useRef } from 'react';
import { Users } from 'lucide-react';
import { DrawerSlot } from './DrawerSlot';
import { NavRail } from './NavRail';
import { CenterPageHost } from './CenterPageHost';
import { useNavStore } from '@/lib/navStore';
import { useChatStore } from '@/lib/stores';
import { CharacterSelector } from '@/components/CharacterSelector';
import { DragDropOverlay } from '@/components/DragDropOverlay';
import { WorldInfoPanel } from '@/panels/WorldInfoPanel';
import { ExtensionsPanel } from '@/panels/ExtensionsPanel';
import { ConnectionsPanel } from '@/panels/ConnectionsPanel';
import { TextOptionsPanel } from '@/panels/TextOptionsPanel';
import { SettingsPanel } from '@/panels/SettingsPanel';
import { UISettingsPanel } from '@/panels/UISettingsPanel';
import { GenerationPanel } from '@/panels/GenerationPanel';
import { cn } from '@/lib/utils';

const TOP_DRAWER_PANELS: Record<string, React.ComponentType> = {
  worldinfo: WorldInfoPanel,
  extensions: ExtensionsPanel,
  connections: ConnectionsPanel,
  textoptions: TextOptionsPanel,
  'ui-settings': UISettingsPanel,
  settings: SettingsPanel,
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

      <div className="relative flex flex-1 overflow-hidden">
        <GenerationPanel closed={!genSidebarOpen} onToggle={toggleGenSidebar} />
        <CenterPageHost />
        <CharactersPanel />
      </div>
    </div>
  );
}
