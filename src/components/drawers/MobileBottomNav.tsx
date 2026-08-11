import { useEffect, useState } from 'react';
import {
  MessageSquare,
  Pencil,
  BookMarked,
  Zap,
  Users,
  Compass,
  Ellipsis,
  Settings,
  Plug,
  FileText,
  UserCircle,
  BookOpen,
  Puzzle,
  Palette,
  X,
  Shirt,
} from 'lucide-react';
import { useNavStore, type SectionId, type TopDrawerId } from '@/lib/navStore';
import { useChatStore } from '@/lib/stores';
import { useExtensionEnabled } from '@/hooks/useExtensionEnabled';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  genSidebarOpen: boolean;
  onToggleGenSidebar: () => void;
  position?: 'top' | 'bottom';
}

interface NavItem {
  id: SectionId | 'generation' | 'characters';
  icon: React.ReactNode;
  label: string;
  requiresCharacter?: boolean;
}

interface MoreItem {
  id: TopDrawerId;
  icon: React.ReactNode;
  label: string;
  requiresCharacter?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'chats', icon: <MessageSquare size={20} />, label: 'Chats', requiresCharacter: true },
  { id: 'character-editor', icon: <Pencil size={20} />, label: 'Editor', requiresCharacter: true },
  { id: 'lorebook', icon: <BookMarked size={20} />, label: 'Lore', requiresCharacter: true },
  { id: 'outfit', icon: <Shirt size={20} />, label: 'Outfit', requiresCharacter: true },
  { id: 'generation', icon: <Zap size={20} />, label: 'Gen' },
  { id: 'characters', icon: <Users size={20} />, label: 'Chars' },
  { id: 'character-browser', icon: <Compass size={20} />, label: 'Browse' },
];

/** Top-drawer items accessible from the More sheet — mirrors NavRail's drawer row. */
const MORE_ITEMS: MoreItem[] = [
  { id: 'worldinfo', icon: <BookOpen size={18} />, label: 'World Info' },
  { id: 'extensions', icon: <Puzzle size={18} />, label: 'Extensions' },
  { id: 'connections', icon: <Plug size={18} />, label: 'Connections' },
  { id: 'textoptions', icon: <FileText size={18} />, label: 'Text Options' },
  { id: 'personas', icon: <UserCircle size={18} />, label: 'Personas' },
  { id: 'ui-settings', icon: <Palette size={18} />, label: 'UI Settings' },
  { id: 'settings', icon: <Settings size={18} />, label: 'Settings' },
];

export function MobileBottomNav({
  genSidebarOpen,
  onToggleGenSidebar,
  position = 'bottom',
}: MobileBottomNavProps) {
  const sectionId = useNavStore((s) => s.sectionId);
  const openSection = useNavStore((s) => s.openSection);
  const charactersOpen = useNavStore((s) => s.charactersOpen);
  const toggleCharacters = useNavStore((s) => s.toggleCharacters);
  const topDrawer = useNavStore((s) => s.topDrawer);
  const openTopDrawer = useNavStore((s) => s.openTopDrawer);
  const activeCharacterId = useChatStore((s) => s.activeCharacterId);
  const [moreOpen, setMoreOpen] = useState(false);
  const isTop = position === 'top';
  const outfitEnabled = useExtensionEnabled('outfit');

  const visibleMoreItems = MORE_ITEMS.filter((item) => {
    if (item.requiresCharacter && activeCharacterId === null) return false;
    return true;
  });

  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moreOpen]);

  const handleItemClick = (item: NavItem) => {
    if (item.id === 'generation') {
      onToggleGenSidebar();
    } else if (item.id === 'characters') {
      toggleCharacters();
    } else {
      openSection(item.id as SectionId);
    }
  };

  const handleMoreItemClick = (id: TopDrawerId) => {
    setMoreOpen(false);
    openTopDrawer(id);
  };

  const isActive = (item: NavItem) => {
    if (item.id === 'generation') return genSidebarOpen;
    if (item.id === 'characters') return charactersOpen;
    return sectionId === item.id;
  };

  return (
    <nav
      className={cn(
        'border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 relative backdrop-blur-md',
        isTop ? 'safe-area-top border-b' : 'safe-area-bottom border-t',
      )}
    >
      {/* Backdrop — dims and dismisses on tap. Kept mounted so the fade animates on close too. */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200',
          moreOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMoreOpen(false)}
        aria-hidden="true"
      />

      {moreOpen && (
        <>
          {/* More menu bottom sheet */}
          <div
            role="menu"
            aria-label="More options"
            className={cn(
              'border-border bg-popover text-popover-foreground animate-in fade-in absolute right-2 left-2 z-50 overflow-hidden rounded-xl border shadow-lg duration-200',
              isTop
                ? 'slide-in-from-top-2 top-full mt-2'
                : 'slide-in-from-bottom-2 bottom-full mb-2',
            )}
          >
            <div aria-hidden className="bg-border mx-auto mt-2 h-1 w-10 rounded-full" />

            <div className="flex items-center justify-between px-4 pt-2 pb-1">
              <span className="mono-tag text-ember">{`> more`}</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="touch-target text-muted-foreground hover:text-ember flex h-8 w-8 items-center justify-center rounded-md transition-colors"
                aria-label="Close more menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto pb-2">
              {visibleMoreItems.map((item) => {
                const active = topDrawer === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    onClick={() => handleMoreItemClick(item.id)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      active
                        ? 'bg-accent text-accent-foreground'
                        : 'text-foreground hover:bg-accent/50 hover:text-accent-foreground',
                    )}
                    aria-current={active ? 'true' : undefined}
                  >
                    <span
                      className={cn(
                        'shrink-0',
                        active ? 'text-accent-foreground' : 'text-muted-foreground',
                      )}
                      aria-hidden
                    >
                      {item.icon}
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="border-border/60 bg-background/40 flex items-center justify-between border-t px-4 py-2">
              <span className="mono-tag text-muted-foreground/40">{`{ more }`}</span>
              <span className="mono-tag text-ember/40">⌑</span>
            </div>
          </div>
        </>
      )}

      <div className="flex items-center justify-around px-2 py-1">
        {NAV_ITEMS.filter((item) => !item.requiresCharacter || activeCharacterId !== null).map(
          (item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item)}
              className={cn(
                'touch-target relative flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2 transition-colors',
                isActive(item) ? 'text-ember' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-label={item.label}
              aria-current={isActive(item) ? 'page' : undefined}
            >
              {item.icon}
              {item.requiresCharacter && (
                <span
                  aria-hidden
                  className="bg-ember ring-background pointer-events-none absolute top-1 right-2 h-1.5 w-1.5 rounded-full ring-2"
                />
              )}
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ),
        )}

        {/* More menu trigger */}
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          className={cn(
            'touch-target relative flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2 transition-colors',
            moreOpen ? 'text-ember' : 'text-muted-foreground hover:text-foreground',
          )}
          aria-label="More options"
          aria-expanded={moreOpen}
          aria-haspopup="menu"
        >
          <Ellipsis size={20} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}
