import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DrawerSlotProps {
  direction: 'top' | 'characters';
  open: boolean;
  children: ReactNode;
}

export function DrawerSlot({ direction, open, children }: DrawerSlotProps) {
  return (
    <div
      data-drawer-slot={direction}
      className={cn(
        direction === 'top' ? 'drawer-top' : 'drawer-characters',
        direction === 'top' ? open && 'drawer-open' : !open && 'drawer-closed',
        direction === 'top' && 'p-2.5',
        direction === 'characters' && 'p-0',
      )}
    >
      {children}
    </div>
  );
}
