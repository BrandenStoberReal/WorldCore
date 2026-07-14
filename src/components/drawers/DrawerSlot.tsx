import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface DrawerSlotProps {
  side: "left" | "right"
  open: boolean
  children: ReactNode
}

export function DrawerSlot({ side, open, children }: DrawerSlotProps) {
  return (
    <aside
      data-drawer-slot={side}
      className={cn(
        "drawer-slot",
        side === "left" ? "drawer-left" : "drawer-right",
        open && "drawer-open",
      )}
    >
      {children}
    </aside>
  )
}
