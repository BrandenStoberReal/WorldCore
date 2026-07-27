import { cn } from '@/lib/utils';

interface BadgeProps {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}

export function Badge({ label, value, icon: Icon, accent }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px]',
        accent
          ? 'border-ember/40 bg-ember/10 text-ember'
          : 'border-border bg-muted/40 text-foreground/70',
      )}
    >
      <span className="mono-tag opacity-70">{label}</span>
      {Icon && <Icon className="h-2.5 w-2.5 opacity-70" />}
      <span className="mono-tag font-bold tabular-nums">{value}</span>
    </span>
  );
}
