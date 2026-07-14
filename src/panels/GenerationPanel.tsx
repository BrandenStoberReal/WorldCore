import { GenerationSidebar } from "@/components/GenerationSidebar"

export function GenerationPanel() {
  return (
    <aside data-panel="generation" className="flex flex-col gap-2 h-full">
      <GenerationSidebar mode="drawer" />
    </aside>
  )
}
