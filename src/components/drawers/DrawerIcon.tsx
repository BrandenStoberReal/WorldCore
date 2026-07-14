import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { useNavStore, type SectionId, type DrawerSlot } from "@/lib/navStore"

interface DrawerIconProps {
  icon: ReactNode
  label: string
  sectionId: SectionId
  slot: DrawerSlot | "center"
}

export function DrawerIcon({ icon, label, sectionId, slot }: DrawerIconProps) {
  const activeSection = useNavStore((s) => s.sectionId)
  const leftDrawer = useNavStore((s) => s.leftDrawer)
  const rightDrawer = useNavStore((s) => s.rightDrawer)
  const openSection = useNavStore((s) => s.openSection)
  const openLeftDrawer = useNavStore((s) => s.openLeftDrawer)
  const openRightDrawer = useNavStore((s) => s.openRightDrawer)
  const closeLeftDrawer = useNavStore((s) => s.closeLeftDrawer)
  const closeRightDrawer = useNavStore((s) => s.closeRightDrawer)

  const isActive =
    slot === "center"
      ? activeSection === sectionId
      : slot === "left"
        ? leftDrawer === sectionId
        : rightDrawer === sectionId

  function handleClick() {
    if (slot === "center") {
      openSection(sectionId)
    } else if (slot === "left") {
      if (leftDrawer === sectionId) {
        closeLeftDrawer()
      } else {
        openLeftDrawer(sectionId)
      }
    } else {
      if (rightDrawer === sectionId) {
        closeRightDrawer()
      } else {
        openRightDrawer(sectionId)
      }
    }
  }

  return (
    <button
      data-drawer-icon={sectionId}
      onClick={handleClick}
      aria-pressed={isActive}
      title={label}
      className={cn(
        "flex items-center justify-center w-10 h-10 rounded-md transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground"
      )}
    >
      {icon}
    </button>
  )
}
