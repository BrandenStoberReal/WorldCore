import { DrawerSlot } from "./DrawerSlot"
import { NavRail } from "./NavRail"
import { CenterPageHost } from "./CenterPageHost"
import { useNavStore } from "@/lib/navStore"

/** Placeholder drawer content — real panel wiring happens in T7-T14. */
function DrawerContent({ sectionId }: { sectionId: string }) {
  return <div className="p-4">{sectionId}</div>
}

export function DrawerShell() {
  const leftDrawer = useNavStore((s) => s.leftDrawer)
  const rightDrawer = useNavStore((s) => s.rightDrawer)

  return (
    <div data-drawer-shell className="flex h-screen overflow-hidden bg-background">
      <NavRail />
      <DrawerSlot side="left" open={leftDrawer !== null}>
        {leftDrawer && <DrawerContent sectionId={leftDrawer} />}
      </DrawerSlot>
      <CenterPageHost />
      <DrawerSlot side="right" open={rightDrawer !== null}>
        {rightDrawer && <DrawerContent sectionId={rightDrawer} />}
      </DrawerSlot>
    </div>
  )
}
