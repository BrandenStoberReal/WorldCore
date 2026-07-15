import { useRef } from "react"
import { DrawerSlot } from "./DrawerSlot"
import { NavRail } from "./NavRail"
import { CenterPageHost } from "./CenterPageHost"
import { useNavStore } from "@/lib/navStore"
import { CharactersPanel } from "@/panels/CharactersPanel"
import { WorldInfoPanel } from "@/panels/WorldInfoPanel"
import { ExtensionsPanel } from "@/panels/ExtensionsPanel"
import { ConnectionsPanel } from "@/panels/ConnectionsPanel"
import { TextOptionsPanel } from "@/panels/TextOptionsPanel"
import { GenerationPanel } from "@/panels/GenerationPanel"

const TOP_DRAWER_PANELS: Record<string, React.ComponentType> = {
  worldinfo: WorldInfoPanel,
  extensions: ExtensionsPanel,
  connections: ConnectionsPanel,
  textoptions: TextOptionsPanel,
}

export function DrawerShell() {
  const topDrawer = useNavStore((s) => s.topDrawer)
  const charactersOpen = useNavStore((s) => s.charactersOpen)
  const genSidebarOpen = useNavStore((s) => s.genSidebarOpen)
  const toggleGenSidebar = useNavStore((s) => s.toggleGenSidebar)

  const lastTopPanelRef = useRef<React.ComponentType | null>(null)
  const CurrentTopPanel = topDrawer ? TOP_DRAWER_PANELS[topDrawer] : null
  if (CurrentTopPanel) lastTopPanelRef.current = CurrentTopPanel
  const TopPanel = CurrentTopPanel ?? lastTopPanelRef.current

  return (
    <div data-drawer-shell className="flex flex-col h-screen overflow-hidden bg-background">
      <NavRail />

      <DrawerSlot direction="top" open={topDrawer !== null}>
        {TopPanel && <TopPanel />}
      </DrawerSlot>

      <div className="flex flex-1 overflow-hidden relative">
        <GenerationPanel closed={!genSidebarOpen} onToggle={toggleGenSidebar} />
        <CenterPageHost />

        <DrawerSlot direction="characters" open={charactersOpen}>
          <CharactersPanel />
        </DrawerSlot>
      </div>
    </div>
  )
}
