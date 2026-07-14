import { useNavStore, type SectionId } from "@/lib/navStore"

const SECTION_LABELS: Record<SectionId, string> = {
  welcome: "Welcome",
  characters: "Characters",
  chats: "Chats",
  worldinfo: "World Info",
  settings: "Settings",
  extensions: "Extensions",
  connections: "Connections",
}

export function CenterPageHost() {
  const sectionId = useNavStore((s) => s.sectionId)

  return (
    <main data-center-host className="flex-1 overflow-auto">
      <div className="flex items-center justify-center h-full">
        <span className="mono-tag text-muted-foreground/45">
          {SECTION_LABELS[sectionId] ?? sectionId}
        </span>
      </div>
    </main>
  )
}
