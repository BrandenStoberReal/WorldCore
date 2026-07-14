import { DrawerSlot } from "./DrawerSlot"
import { CenterPageHost } from "./CenterPageHost"
import { useNavStore } from "@/lib/navStore"

/** Placeholder for NavRail — will be built in T5. */
function NavRailStub() {
  return <nav data-nav-rail className="w-14 shrink-0 border-r border-border" />
}

/** Placeholder drawer content — real panel wiring happens in T7-T14. */
function DrawerContent({ sectionId }: { sectionId: string }) {
  return <div className="p-4">{sectionId}</div>
}

export function DrawerShell() {
  const leftDrawer = useNavStore((s) => s.leftDrawer)
  const rightDrawer = useNavStore((s) => s.rightDrawer)

  return (
    <div data-drawer-shell className="flex h-screen overflow-hidden bg-background">
      <NavRailStub />
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
