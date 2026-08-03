import { Zap, X } from 'lucide-react';
import { GenerationSidebar } from '@/components/GenerationSidebar';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/utils';

interface GenerationPanelProps {
  closed?: boolean;
  onToggle?: () => void;
}

export function GenerationPanel({ closed, onToggle }: GenerationPanelProps) {
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return (
      <>
        {!closed && onToggle && (
          <div className="fixed inset-0 z-40">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={onToggle}
              aria-hidden="true"
            />
            <div
              className="bg-background absolute right-0 bottom-0 left-0 mx-auto flex max-h-[90vh] flex-col rounded-t-2xl shadow-xl"
              role="dialog"
              aria-label="Generation settings"
            >
              {/* Drag handle */}
              <div aria-hidden className="bg-border mx-auto mt-2 h-1 w-10 shrink-0 rounded-full" />

              <div className="flex shrink-0 items-center justify-between border-b px-4 pt-2 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="text-ember h-4 w-4" strokeWidth={2} />
                  <span className="font-medium">Generation Settings</span>
                </div>
                <button
                  type="button"
                  onClick={onToggle}
                  className="touch-target hover:bg-muted rounded-lg p-2 transition-colors"
                  aria-label="Close generation settings"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="scroll-mobile pb-safe overflow-y-auto">
                <GenerationSidebar mode="drawer" onToggle={onToggle} />
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="relative flex shrink-0">
      <aside data-panel="generation" className={cn('generation-sidebar', closed && 'closed')}>
        <GenerationSidebar mode="drawer" onToggle={onToggle} />
      </aside>

      {closed && onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'border-border bg-background/60 hover:bg-accent/40 text-foreground/40 hover:text-ember',
            'flex h-12 w-3 items-center justify-center rounded-r-md border-y border-r',
            'backdrop-blur-sm transition-all duration-200',
          )}
          title="Show generation options"
          aria-label="Show generation options"
        >
          <Zap className="h-3 w-3" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
