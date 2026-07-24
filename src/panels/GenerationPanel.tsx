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
            <div className="absolute inset-y-0 right-0 w-full max-w-sm">
              <div className="bg-background h-full overflow-y-auto shadow-xl">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Zap className="text-ember h-4 w-4" strokeWidth={2} />
                    <span className="font-medium">Generation Settings</span>
                  </div>
                  <button
                    type="button"
                    onClick={onToggle}
                    className="hover:bg-muted rounded-lg p-2 transition-colors"
                    aria-label="Close generation settings"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
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
