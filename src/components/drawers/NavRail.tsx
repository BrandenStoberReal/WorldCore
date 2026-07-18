import { Users, BookOpen, Puzzle, Plug, FileText, BookMarked, Settings } from 'lucide-react';
import { DrawerIcon } from './DrawerIcon';
import { useNavStore, type SectionId, type TopDrawerId } from '@/lib/navStore';
import { cn } from '@/lib/utils';

interface NavItem {
  id: SectionId;
  icon: React.ReactNode;
  label: string;
  behavior: 'section' | 'top-drawer' | 'characters';
}

function ConnectionIcon() {
  const connected = useNavStore((s) => s.connected);
  return (
    <span
      className={cn('inline-flex', connected ? 'text-emerald-500' : 'text-destructive')}
      aria-hidden
    >
      <Plug size={16} />
    </span>
  );
}

const NAV_ITEMS: NavItem[] = [
  { id: 'characters', icon: <Users size={16} />, label: 'Characters', behavior: 'characters' },
  { id: 'lorebook', icon: <BookMarked size={16} />, label: 'Lorebook', behavior: 'section' },
  { id: 'worldinfo', icon: <BookOpen size={16} />, label: 'World Info', behavior: 'top-drawer' },
  { id: 'extensions', icon: <Puzzle size={16} />, label: 'Extensions', behavior: 'top-drawer' },
  { id: 'connections', icon: <ConnectionIcon />, label: 'Connections', behavior: 'top-drawer' },
  {
    id: 'textoptions',
    icon: <FileText size={16} />,
    label: 'Text Options',
    behavior: 'top-drawer',
  },
  { id: 'settings', icon: <Settings size={16} />, label: 'Settings', behavior: 'top-drawer' },
];

export function NavRail() {
  return (
    <header
      data-topbar
      className="border-border bg-background z-30 flex h-10 flex-shrink-0 items-center justify-between border-b px-2.5"
    >
      <div className="flex items-center gap-1.5">
        <span className="text-primary text-base leading-none font-bold">W</span>
        <span className="text-muted-foreground hidden text-[13px] font-medium tracking-tight sm:block">
          WorldCore
        </span>
      </div>

      <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-0.5">
        {NAV_ITEMS.map((item) => (
          <DrawerIcon
            key={item.id}
            icon={item.icon}
            label={item.label}
            sectionId={item.id}
            behavior={item.behavior}
          />
        ))}
      </nav>

      <div />
    </header>
  );
}
