import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center px-4 py-8 text-center', className)}
    >
      {icon && (
        <div className="border-border bg-accent/40 mb-2 flex h-8 w-8 items-center justify-center rounded-md border">
          {icon}
        </div>
      )}
      <p className="mono-tag text-foreground/60 mb-0.5">{title}</p>
      {description && <p className="text-foreground/40 text-[10px]">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
