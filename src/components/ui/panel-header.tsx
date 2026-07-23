import { cn } from '@/lib/utils';

interface PanelHeaderProps {
  icon?: React.ReactNode;
  title: string;
  count?: number;
  actions?: React.ReactNode;
  className?: string;
}

export function PanelHeader({ icon, title, count, actions, className }: PanelHeaderProps) {
  return (
    <div className={cn('border-border/40 border-b px-2.5 pt-2.5 pb-2', className)}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="display-host text-[13px] leading-none">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {count !== undefined && (
            <span className="mono-tag text-foreground/40 tabular-nums">
              {String(count).padStart(2, '0')}
            </span>
          )}
          {actions}
        </div>
      </div>
    </div>
  );
}
