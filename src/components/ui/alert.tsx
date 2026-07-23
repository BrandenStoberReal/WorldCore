import { cn } from '@/lib/utils';

interface AlertProps {
  variant?: 'error' | 'success' | 'warning';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const variantStyles = {
  error: 'border-destructive/40 bg-destructive/5',
  success: 'border-emerald-500/40 bg-emerald-500/5',
  warning: 'border-amber-500/40 bg-amber-500/5',
};

const textStyles = {
  error: 'text-destructive',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
};

export function Alert({ variant = 'error', title, children, className }: AlertProps) {
  return (
    <div className={cn('rounded-md border p-3', variantStyles[variant], className)}>
      {title && <span className={cn('mono-tag', textStyles[variant])}>{title}</span>}
      <p className={cn('text-muted-foreground mt-1 text-[12px]', title && 'mt-1')}>{children}</p>
    </div>
  );
}
