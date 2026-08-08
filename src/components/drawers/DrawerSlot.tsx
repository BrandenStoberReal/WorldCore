import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useNavStore } from '@/lib/navStore';
import { cn } from '@/lib/utils';

interface DrawerSlotProps {
  direction: 'top' | 'characters';
  open: boolean;
  children: ReactNode;
}

export function DrawerSlot({ direction, open, children }: DrawerSlotProps) {
  const { isMobile } = useBreakpoint();
  const closeCharacters = useNavStore((s) => s.closeCharacters);
  const closeTopDrawer = useNavStore((s) => s.closeTopDrawer);

  const handleClose = useCallback(() => {
    if (direction === 'characters') {
      closeCharacters();
    } else {
      closeTopDrawer();
    }
  }, [direction, closeCharacters, closeTopDrawer]);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!isMobile || !open) return;

      const touch = e.changedTouches[0];
      const startX = (e.currentTarget as HTMLElement).dataset.startX;
      const startY = (e.currentTarget as HTMLElement).dataset.startY;
      if (!startX || !startY || !touch) return;

      const deltaX = touch.clientX - parseInt(startX, 10);
      const deltaY = touch.clientY - parseInt(startY, 10);
      const threshold = 50;

      // Only trigger close if horizontal swipe is dominant (prevents accidental close during vertical scroll)
      if (Math.abs(deltaX) < Math.abs(deltaY)) return;

      if (direction === 'characters' && deltaX > threshold) {
        handleClose();
      } else if (direction === 'top' && deltaX < -threshold) {
        handleClose();
      }
    },
    [isMobile, open, direction, handleClose],
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      (e.currentTarget as HTMLElement).dataset.startX = String(touch.clientX);
      (e.currentTarget as HTMLElement).dataset.startY = String(touch.clientY);
    }
  }, []);

  return (
    <div
      data-drawer-slot={direction}
      className={cn(
        direction === 'top' ? 'drawer-top' : 'drawer-characters',
        direction === 'top' ? open && 'drawer-open' : !open && 'drawer-closed',
        direction === 'top' && 'p-2.5',
        direction === 'characters' && 'p-0',
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
      {/* Top-drawer close affordance — mobile only (sm:hidden).
          Desktop relies on Escape key + clicking another nav icon.
          Placed top-LEFT to avoid clashing with PageHeader's right-aligned action slot
          (6 of 7 panels use it). Swipe-to-close also expects leftward motion on top drawers.
          Characters drawer already has its own close affordance in DrawerShell. */}
      {direction === 'top' && open && (
        <button
          type="button"
          onClick={handleClose}
          className={cn(
            'touch-target absolute left-2.5 z-50 rounded-lg p-2 transition-colors sm:hidden',
            'text-muted-foreground hover:text-ember hover:bg-muted',
            'bg-background/80 backdrop-blur-sm border border-border/60 shadow-sm',
          )}
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 0.625rem)',
          }}
          aria-label="Close panel"
          title="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
