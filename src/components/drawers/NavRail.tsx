import {
  MessageSquare,
  BookOpen,
  Puzzle,
  Plug,
  FileText,
  BookMarked,
  Settings,
  Pencil,
  Palette,
} from 'lucide-react';
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

const SECTION_ITEMS: NavItem[] = [
  { id: 'chats', icon: <MessageSquare size={16} />, label: 'Chats', behavior: 'section' },
  {
    id: 'character-editor',
    icon: <Pencil size={16} />,
    label: 'Character Editor',
    behavior: 'section',
  },
  { id: 'lorebook', icon: <BookMarked size={16} />, label: 'Lorebook', behavior: 'section' },
];

const DRAWER_ITEMS: NavItem[] = [
  { id: 'worldinfo', icon: <BookOpen size={16} />, label: 'World Info', behavior: 'top-drawer' },
  { id: 'extensions', icon: <Puzzle size={16} />, label: 'Extensions', behavior: 'top-drawer' },
  { id: 'connections', icon: <ConnectionIcon />, label: 'Connections', behavior: 'top-drawer' },
  {
    id: 'textoptions',
    icon: <FileText size={16} />,
    label: 'Text Options',
    behavior: 'top-drawer',
  },
  { id: 'ui-settings', icon: <Palette size={16} />, label: 'UI Settings', behavior: 'top-drawer' },
  { id: 'settings', icon: <Settings size={16} />, label: 'Settings', behavior: 'top-drawer' },
];

export function NavRail() {
  const alwaysShowViewportNavbar = useNavStore((s) => s.alwaysShowViewportNavbar);

  return (
    <header
      data-topbar
      className={cn(
        'border-border bg-background z-30 flex flex-shrink-0 flex-col border-b',
        !alwaysShowViewportNavbar && 'group/nav',
      )}
    >
      {/* Top row: drawer-based nav items */}
      <div className="flex h-10 items-center justify-between px-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-primary text-base leading-none font-bold">W</span>
          <span className="text-muted-foreground hidden text-[13px] font-medium tracking-tight sm:block">
            WorldCore
          </span>
        </div>

        <nav className="absolute left-1/2 flex -translate-x-1/2 items-center gap-0.5">
          {DRAWER_ITEMS.map((item) => (
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
      </div>

      <nav
        className={cn(
          'bg-muted/30 z-10 flex items-center justify-center gap-1 border-t-2 px-2.5 transition-all duration-200',
          alwaysShowViewportNavbar
            ? 'border-border/60 h-9 py-1 opacity-100'
            : 'group-hover/nav:border-border/60 h-0 overflow-hidden border-transparent opacity-0 group-hover/nav:h-9 group-hover/nav:py-1 group-hover/nav:opacity-100',
        )}
      >
        {SECTION_ITEMS.map((item) => (
          <DrawerIcon
            key={item.id}
            icon={item.icon}
            label={item.label}
            sectionId={item.id}
            behavior={item.behavior}
          />
        ))}
      </nav>
    </header>
  );
}
