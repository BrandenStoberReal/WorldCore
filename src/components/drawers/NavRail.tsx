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
  UserCircle,
  Compass,
  Shirt,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { DrawerIcon } from './DrawerIcon';
import { useNavStore, type SectionId, type TopDrawerId } from '@/lib/navStore';
import { useChatStore } from '@/lib/stores';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useExtensionEnabled } from '@/hooks/useExtensionEnabled';
import { cn } from '@/lib/utils';

interface NavItem {
  id: SectionId | TopDrawerId;
  icon: ReactNode;
  label: string;
  behavior: 'section' | 'top-drawer' | 'characters';
  requiresCharacter?: boolean;
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
  {
    id: 'chats',
    icon: <MessageSquare size={16} />,
    label: 'Chats',
    behavior: 'section',
    requiresCharacter: true,
  },
  {
    id: 'character-editor',
    icon: <Pencil size={16} />,
    label: 'Character Editor',
    behavior: 'section',
    requiresCharacter: true,
  },
  {
    id: 'lorebook',
    icon: <BookMarked size={16} />,
    label: 'Lorebook',
    behavior: 'section',
    requiresCharacter: true,
  },
  {
    id: 'character-browser',
    icon: <Compass size={16} />,
    label: 'Browse',
    behavior: 'section',
  },
  {
    id: 'outfit',
    icon: <Shirt size={16} />,
    label: 'Outfit',
    behavior: 'top-drawer',
    requiresCharacter: true,
  },
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
  { id: 'personas', icon: <UserCircle size={16} />, label: 'Personas', behavior: 'top-drawer' },
  { id: 'ui-settings', icon: <Palette size={16} />, label: 'UI Settings', behavior: 'top-drawer' },
  { id: 'settings', icon: <Settings size={16} />, label: 'Settings', behavior: 'top-drawer' },
];

export function NavRail() {
  const topDrawer = useNavStore((s) => s.topDrawer);
  const activeCharacterId = useChatStore((s) => s.activeCharacterId);
  const { isMobile } = useBreakpoint();
  const drawerOpen = topDrawer !== null;
  const outfitEnabled = useExtensionEnabled('outfit');

  const visibleSectionItems = SECTION_ITEMS.filter((item) => {
    if (!item.requiresCharacter || activeCharacterId !== null) {
      if (item.id === 'outfit' && !outfitEnabled) return false;
      return true;
    }
    return false;
  });

  if (isMobile) {
    return null;
  }

  return (
    <header
      data-topbar
      className={cn(
        'border-border bg-background z-10 flex flex-shrink-0 flex-col border-b',
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
          drawerOpen
            ? 'h-0 overflow-hidden border-transparent opacity-0'
            : 'border-border/60 h-9 py-1 opacity-100',
        )}
      >
        {visibleSectionItems.map((item) => (
          <DrawerIcon
            key={item.id}
            icon={item.icon}
            label={item.label}
            sectionId={item.id}
            behavior={item.behavior}
            requiresCharacter={item.requiresCharacter}
          />
        ))}
      </nav>
    </header>
  );
}
