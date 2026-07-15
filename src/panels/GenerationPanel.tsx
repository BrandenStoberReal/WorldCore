import { GenerationSidebar } from "@/components/GenerationSidebar"
import { cn } from "@/lib/utils"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

interface GenerationPanelProps {
  closed?: boolean
  onToggle?: () => void
}

export function GenerationPanel({ closed, onToggle }: GenerationPanelProps) {
  return (
    <aside
      data-panel="generation"
      className={cn("generation-sidebar", closed && "closed")}
    >
      <GenerationSidebar mode="drawer" />
      <button
        type="button"
        onClick={onToggle}
        className="absolute top-3 right-2 z-10 p-1 rounded-sm text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 transition-colors"
        title={closed ? "Show generation options" : "Hide generation options"}
        aria-label={closed ? "Show generation options" : "Hide generation options"}
      >
        {closed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
      </button>
    </aside>
  )
}
