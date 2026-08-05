import { useContext, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useNavStore, type SectionId, type TopDrawerId } from '@/lib/navStore';
import { PrefetchContext } from './DrawerShell';

interface DrawerIconProps {
  icon: ReactNode;
  label: string;
  sectionId: SectionId | TopDrawerId;
  behavior: 'section' | 'top-drawer' | 'characters';
  requiresCharacter?: boolean;
}

export function DrawerIcon({
  icon,
  label,
  sectionId,
  behavior,
  requiresCharacter,
}: DrawerIconProps) {
  const activeSection = useNavStore((s) => s.sectionId);
  const topDrawer = useNavStore((s) => s.topDrawer);
  const charactersOpen = useNavStore((s) => s.charactersOpen);
  const openSection = useNavStore((s) => s.openSection);
  const openTopDrawer = useNavStore((s) => s.openTopDrawer);
  const toggleCharacters = useNavStore((s) => s.toggleCharacters);
  const prefetch = useContext(PrefetchContext);

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

  function handleMouseEnter() {
    if (behavior === 'top-drawer') {
      prefetch(sectionId);
    }
  }

  return (
    <button
      data-drawer-icon={sectionId}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      aria-pressed={isActive}
      title={label}
      className={cn(
        'relative flex items-center justify-center rounded p-1.5 transition-all duration-200 hover:scale-105',
        'hover:bg-accent hover:text-accent-foreground',
        isActive
          ? 'text-accent-foreground bg-accent scale-105'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {requiresCharacter && (
        <span
          aria-hidden
          className="bg-ember ring-background pointer-events-none absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full ring-2"
        />
      )}
    </button>
  );
}
