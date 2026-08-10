import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveSlot } from '@/components/Responsive';
import { MobileModal } from '@/components/MobileModal';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const FOCUSABLE_SELECTORS = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      const timer = setTimeout(() => {
        const firstFocusable = containerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTORS);
        firstFocusable?.focus();
      }, 0);
      return () => clearTimeout(timer);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = containerRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <ResponsiveSlot
      mobile={<MobileModal open={open} onClose={onClose} title={title} className={className}>{children}</MobileModal>}
      desktop={
        <div
          className={cn(
            'modal-overlay bg-background/80 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm',
            !open && 'modal-closed',
          )}
          onClick={handleOverlayClick}
          aria-hidden={!open}
          role="dialog"
          aria-modal="true"
          style={{
            background:
              'radial-gradient(circle at 78% 18%, color-mix(in oklch, var(--ember) 12%, transparent) 0%, transparent 50%), color-mix(in oklch, var(--background) 82%, transparent)',
          }}
        >
          <div
            ref={containerRef}
            className={cn(
              'modal-content relative max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-md',
              'border-border bg-card text-card-foreground border',
              'shadow-[0_24px_70px_-12px_color-mix(in oklch,var(--ember)_45%,transparent)]',
              'before:via-ember before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:to-transparent',
              'mx-4 sm:mx-auto',
              className,
            )}
          >
            <div className="border-border bg-card relative sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3 sm:px-5 sm:py-4">
              {title ? (
                <h2 className="display-host text-[18px] leading-none tracking-tight sm:text-[20px]">
                  {title}
                </h2>
              ) : (
                <span className="mono-tag text-ember">{`> sheet`}</span>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                className="text-muted-foreground hover:text-ember touch-target"
              >
                <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </Button>
            </div>

            <div className="px-4 py-4 sm:px-5 sm:py-5 md:px-6">{children}</div>

            <div className="border-border/60 bg-background/40 flex items-center justify-between border-t px-4 py-2.5 sm:px-5">
              <span className="mono-tag text-muted-foreground/40">{`{ sheet }`}</span>
              <span className="mono-tag text-ember/40">⌑</span>
            </div>
          </div>
        </div>
      }
    />
  );
}
