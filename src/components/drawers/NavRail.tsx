import { Users, MessageSquare, BookOpen, Puzzle, Plug, Settings } from "lucide-react"
import { DrawerIcon } from "./DrawerIcon"
import { useNavStore, type SectionId } from "@/lib/navStore"

interface SectionConfig {
  id: SectionId
  icon: React.ReactNode
  label: string
  slot: "left" | "right" | "center"
}

const SECTIONS: SectionConfig[] = [
  { id: "characters", icon: <Users size={20} />, label: "Characters", slot: "left" },
  { id: "worldinfo", icon: <BookOpen size={20} />, label: "World Info", slot: "left" },
  { id: "extensions", icon: <Puzzle size={20} />, label: "Extensions", slot: "left" },
  { id: "connections", icon: <Plug size={20} />, label: "Connections", slot: "left" },
  { id: "chats", icon: <MessageSquare size={20} />, label: "Chats", slot: "center" },
  { id: "settings", icon: <Settings size={20} />, label: "Settings", slot: "right" },
]

export function NavRail() {
  return (
    <nav data-nav-rail className="flex flex-col items-center gap-1 w-14 py-3 border-r border-border bg-background flex-shrink-0">
      {/* Logo / brand mark at top */}
      <div className="mb-4 text-lg font-bold text-primary">W</div>

      {/* Section icons */}
      <div className="flex flex-col gap-1">
        {SECTIONS.map((section) => (
          <DrawerIcon
            key={section.id}
            icon={section.icon}
            label={section.label}
            sectionId={section.id}
            slot={section.slot}
          />
        ))}
      </div>
    </nav>
  )
}
