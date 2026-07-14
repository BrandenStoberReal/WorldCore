import { DrawerSlot } from "./DrawerSlot"
import { NavRail } from "./NavRail"
import { CenterPageHost } from "./CenterPageHost"
import { useNavStore } from "@/lib/navStore"
import { CharactersPanel } from "@/panels/CharactersPanel"
import { WorldInfoPanel } from "@/panels/WorldInfoPanel"
import { ExtensionsPanel } from "@/panels/ExtensionsPanel"
import { ConnectionsPanel } from "@/panels/ConnectionsPanel"
import { SettingsPanel } from "@/panels/SettingsPanel"
import { TextOptionsPanel } from "@/panels/TextOptionsPanel"

const TOP_DRAWER_PANELS: Record<string, React.ComponentType> = {
  worldinfo: WorldInfoPanel,
  extensions: ExtensionsPanel,
  connections: ConnectionsPanel,
  settings: SettingsPanel,
  textoptions: TextOptionsPanel,
}

export function DrawerShell() {
  const topDrawer = useNavStore((s) => s.topDrawer)
  const charactersOpen = useNavStore((s) => s.charactersOpen)

  const TopPanel = topDrawer ? TOP_DRAWER_PANELS[topDrawer] : null

  return (
    <div data-drawer-shell className="flex flex-col h-screen overflow-hidden bg-background">
      <NavRail />

      <DrawerSlot direction="top" open={topDrawer !== null}>
        {TopPanel && <TopPanel />}
      </DrawerSlot>

      <div className="flex flex-1 overflow-hidden relative">
        <CenterPageHost />

        <DrawerSlot direction="characters" open={charactersOpen}>
          <CharactersPanel />
        </DrawerSlot>
      </div>
    </div>
  )
}
