import type { ReactNode } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNavStore } from "@/lib/navStore"

interface InlineSectionProps {
  panelId: string
  sectionId: string
  title: string
  defaultOpen?: boolean
  children: ReactNode
}

export function InlineSection({ panelId, sectionId, title, defaultOpen = false, children }: InlineSectionProps) {
  const open = useNavStore((s) => s.inlineDrawers[`${panelId}/${sectionId}`] ?? defaultOpen)
  const toggle = useNavStore((s) => s.toggleInline)

  return (
    <div className="inline-drawer">
      <button
        onClick={() => toggle(panelId, sectionId)}
        aria-expanded={open}
        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium hover:bg-accent/50 rounded-md transition-colors"
      >
        <span>{title}</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      <div className={cn("accordion-content", open && "accordion-open")}>
        <div className="px-3 pb-3">
          {children}
        </div>
      </div>
    </div>
  )
}
