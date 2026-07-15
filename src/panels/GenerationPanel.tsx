import { GenerationSidebar } from '@/components/GenerationSidebar';
import { cn } from '@/lib/utils';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface GenerationPanelProps {
  closed?: boolean;
  onToggle?: () => void;
}

export function GenerationPanel({ closed, onToggle }: GenerationPanelProps) {
  return (
    <div className="relative flex shrink-0">
      <aside data-panel="generation" className={cn('generation-sidebar', closed && 'closed')}>
        <GenerationSidebar mode="drawer" />
      </aside>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'text-foreground/40 hover:text-foreground/70 hover:bg-accent/30 absolute top-3 z-10 rounded-sm p-1 transition-colors',
          closed ? 'left-1' : 'right-2',
        )}
        title={closed ? 'Show generation options' : 'Hide generation options'}
        aria-label={closed ? 'Show generation options' : 'Hide generation options'}
      >
        {closed ? (
          <PanelLeftOpen className="h-3.5 w-3.5" />
        ) : (
          <PanelLeftClose className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
