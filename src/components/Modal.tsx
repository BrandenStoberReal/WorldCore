import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={cn(
        'modal-overlay bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm',
        !open && 'modal-closed',
      )}
      onClick={handleOverlayClick}
      aria-hidden={!open}
      style={{
        background:
          'radial-gradient(circle at 78% 18%, color-mix(in oklch, var(--ember) 12%, transparent) 0%, transparent 50%), color-mix(in oklch, var(--background) 82%, transparent)',
      }}
    >
      <div
        className={cn(
          'modal-content relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-sm',
          'border-border bg-card text-card-foreground border',
          'shadow-[0_24px_70px_-12px_color-mix(in_oklch,var(--ember)_45%,transparent)]',
          'before:via-ember before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:to-transparent',
          className,
        )}
      >
        {/* Header */}
        <div className="border-border bg-card relative sticky top-0 z-10 flex items-center justify-between border-b px-5 py-4">
          {title ? (
            <h2 className="display-host text-[20px] leading-none tracking-tight">{title}</h2>
          ) : (
            <span className="mono-tag text-ember">{`> sheet`}</span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-ember"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 md:px-6">{children}</div>

        {/* Bottom rivet rail */}
        <div className="border-border/60 bg-background/40 flex items-center justify-between border-t px-5 py-2.5">
          <span className="mono-tag text-muted-foreground/40">{`{ sheet }`}</span>
          <span className="mono-tag text-ember/40">⌑</span>
        </div>
      </div>
    </div>
  );
}
