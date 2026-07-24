import { useCallback } from 'react';
import type { ReactNode } from 'react';
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
      if (!startX || !touch) return;

      const deltaX = touch.clientX - parseInt(startX, 10);
      const threshold = 50;

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
    </div>
  );
}
