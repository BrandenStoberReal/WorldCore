import { cn } from '@/lib/utils';

interface StatusToggleProps {
  enabled: boolean;
  onToggle?: () => void;
  showSwitch?: boolean;
  size?: 'sm' | 'md';
  pillClassName?: string;
  switchClassName?: string;
}

export function StatusToggle({
  enabled,
  onToggle,
  showSwitch = true,
  size = 'md',
  pillClassName,
  switchClassName,
}: StatusToggleProps) {
  const renderSwitch = showSwitch !== false && onToggle;

  return (
    <span className={cn('inline-flex items-center gap-1.5', pillClassName)}>
      {enabled ? (
        <span className="mono-tag bg-ember/15 text-ember rounded-md px-1 py-px">ON</span>
      ) : (
        <span className="mono-tag bg-muted/50 text-muted-foreground/55 rounded-md px-1 py-px">
          OFF
        </span>
      )}
      {renderSwitch && (
        <button
          role="switch"
          aria-checked={enabled}
          onClick={onToggle}
          className={cn(
            'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
            size === 'sm' ? 'h-3.5 w-6' : 'h-4 w-7',
            enabled ? 'bg-ember' : 'bg-muted',
            switchClassName,
          )}
        >
          <span className="sr-only">Toggle</span>
          <span
            className={cn(
              'bg-background pointer-events-none inline-block transform rounded-full shadow ring-0 transition-transform',
              size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3',
              enabled ? (size === 'sm' ? 'translate-x-3' : 'translate-x-3.5') : 'translate-x-0',
            )}
          />
        </button>
      )}
    </span>
  );
}
