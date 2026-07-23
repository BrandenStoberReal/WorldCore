import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label?: string;
  variant?: 'default' | 'destructive';
  active?: boolean;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, label, variant = 'default', active, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'flex items-center gap-1 rounded-md p-0.5 transition-colors',
          active ? 'bg-accent/40 text-foreground' : 'text-foreground/40 hover:bg-accent/30',
          variant === 'destructive' && 'hover:text-destructive hover:bg-destructive/10',
          variant === 'default' && 'hover:text-ember',
          className,
        )}
        {...props}
      >
        {icon}
        {label && <span className="mono-tag">{label}</span>}
        {children}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';

export { IconButton };
