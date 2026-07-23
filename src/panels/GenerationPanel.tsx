import { Zap } from 'lucide-react';
import { GenerationSidebar } from '@/components/GenerationSidebar';
import { cn } from '@/lib/utils';

interface GenerationPanelProps {
  closed?: boolean;
  onToggle?: () => void;
}

export function GenerationPanel({ closed, onToggle }: GenerationPanelProps) {
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
