import { cn } from '@/lib/utils';
import { useGenerationStore, type GenerationMode } from '@/lib/stores';
import { MessageSquare, FileText } from 'lucide-react';

const MODE_OPTIONS: {
  value: GenerationMode;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  { value: 'chat', label: 'Chat', icon: MessageSquare },
  { value: 'text', label: 'Text', icon: FileText },
];

export function GenerationModeToggle() {
  const mode = useGenerationStore((s) => s.mode);
  const setMode = useGenerationStore((s) => s.setMode);

  return (
    <div
      className="border-border bg-background/50 flex rounded-md border p-0.5"
      role="radiogroup"
      aria-label="Generation mode"
    >
      {MODE_OPTIONS.map(({ value, label, icon: Icon }) => {
        const isActive = mode === value;
        return (
          <button
            key={value}
            role="radio"
            type="button"
            aria-checked={isActive}
            onClick={() => setMode(value)}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center gap-1 rounded-sm px-1.5 py-1',
              'text-[10px] font-medium transition-all duration-200',
              isActive
                ? 'bg-ember/15 text-ember border-ember/25 border shadow-sm'
                : 'text-foreground/50 hover:text-foreground/70 hover:bg-accent/30 border border-transparent',
            )}
          >
            <Icon className="h-2.5 w-2.5 shrink-0" strokeWidth={2} />
            <span className="mono-tag truncate">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
