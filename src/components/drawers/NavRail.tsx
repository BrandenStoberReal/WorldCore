import { Users, BookOpen, Puzzle, Plug, FileText } from 'lucide-react';
import { DrawerIcon } from './DrawerIcon';
import { useNavStore, type SectionId, type TopDrawerId } from '@/lib/navStore';

interface NavItem {
  id: SectionId;
  icon: React.ReactNode;
  label: string;
  behavior: 'section' | 'top-drawer' | 'characters';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'characters', icon: <Users size={18} />, label: 'Characters', behavior: 'characters' },
  { id: 'worldinfo', icon: <BookOpen size={18} />, label: 'World Info', behavior: 'top-drawer' },
  { id: 'extensions', icon: <Puzzle size={18} />, label: 'Extensions', behavior: 'top-drawer' },
  { id: 'connections', icon: <Plug size={18} />, label: 'Connections', behavior: 'top-drawer' },
  {
    id: 'textoptions',
    icon: <FileText size={18} />,
    label: 'Text Options',
    behavior: 'top-drawer',
  },
];

export function NavRail() {
  return (
    <header
      data-topbar
      className="border-border bg-background z-30 flex h-12 flex-shrink-0 items-center justify-between border-b px-3"
    >
      <div className="flex items-center gap-1">
        <span className="text-primary text-lg font-bold">W</span>
        <span className="text-muted-foreground hidden text-sm font-medium sm:block">WorldCore</span>
      </div>

      <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
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
