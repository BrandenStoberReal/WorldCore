import { useRef } from 'react';
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
import { GenerationPanel } from '@/panels/GenerationPanel';

const TOP_DRAWER_PANELS: Record<string, React.ComponentType> = {
  worldinfo: WorldInfoPanel,
  extensions: ExtensionsPanel,
  connections: ConnectionsPanel,
  textoptions: TextOptionsPanel,
  settings: SettingsPanel,
};

function CharactersSidebar() {
  const activeCharacterId = useChatStore((s) => s.activeCharacterId);
  const setActiveCharacter = useChatStore((s) => s.setActiveCharacter);
  return <CharacterSelector selectedId={activeCharacterId} onSelect={setActiveCharacter} />;
}

export function DrawerShell() {
  const topDrawer = useNavStore((s) => s.topDrawer);
  const charactersOpen = useNavStore((s) => s.charactersOpen);
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

        <DrawerSlot direction="characters" open={charactersOpen}>
          <CharactersSidebar />
        </DrawerSlot>
      </div>
    </div>
  );
}
