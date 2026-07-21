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
    </div>
  );
}
