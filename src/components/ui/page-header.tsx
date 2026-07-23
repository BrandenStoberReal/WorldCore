import { cn } from '@/lib/utils';

interface PageHeaderProps {
  tag: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ tag, title, description, action, className }: PageHeaderProps) {
  return (
    <header
      className={cn('flex flex-col gap-3 md:flex-row md:items-end md:justify-between', className)}
    >
      <div>
        <div className="mb-1.5 flex items-center gap-2.5">
          <span className="mono-tag text-ember">{tag}</span>
          <span className="bg-ember/40 h-px w-8" />
        </div>
        <h2 className="display-host text-[30px] leading-none tracking-tight">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-1.5 max-w-md text-[13px] leading-snug">
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}
