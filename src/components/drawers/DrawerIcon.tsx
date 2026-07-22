import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useNavStore, type SectionId, type TopDrawerId } from '@/lib/navStore';

interface DrawerIconProps {
  icon: ReactNode;
  label: string;
  sectionId: SectionId;
  behavior: 'section' | 'top-drawer' | 'characters';
}

export function DrawerIcon({ icon, label, sectionId, behavior }: DrawerIconProps) {
  const activeSection = useNavStore((s) => s.sectionId);
  const topDrawer = useNavStore((s) => s.topDrawer);
  const charactersOpen = useNavStore((s) => s.charactersOpen);
  const openSection = useNavStore((s) => s.openSection);
  const openTopDrawer = useNavStore((s) => s.openTopDrawer);
  const toggleCharacters = useNavStore((s) => s.toggleCharacters);

  const isActive =
    behavior === 'section'
      ? activeSection === sectionId
      : behavior === 'top-drawer'
        ? topDrawer === sectionId
        : charactersOpen;

  function handleClick() {
    if (behavior === 'section') {
      openSection(sectionId);
    } else if (behavior === 'top-drawer') {
      openTopDrawer(sectionId as TopDrawerId);
    } else {
      toggleCharacters();
    }
  }

  return (
    <button
      data-drawer-icon={sectionId}
      onClick={handleClick}
      aria-pressed={isActive}
      title={label}
      className={cn(
        'flex items-center justify-center rounded p-1.5 transition-all duration-200 hover:scale-105',
        'hover:bg-accent hover:text-accent-foreground',
        isActive
          ? 'text-accent-foreground bg-accent scale-105'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
    </button>
  );
}
