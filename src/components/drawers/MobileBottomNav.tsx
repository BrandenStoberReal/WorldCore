import { MessageSquare, Pencil, BookMarked, Zap, Users, Settings } from 'lucide-react';
import { useNavStore, type SectionId } from '@/lib/navStore';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  genSidebarOpen: boolean;
  onToggleGenSidebar: () => void;
}

interface NavItem {
  id: SectionId | 'generation' | 'characters';
  icon: React.ReactNode;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'chats', icon: <MessageSquare size={20} />, label: 'Chats' },
  { id: 'character-editor', icon: <Pencil size={20} />, label: 'Editor' },
  { id: 'lorebook', icon: <BookMarked size={20} />, label: 'Lore' },
  { id: 'generation', icon: <Zap size={20} />, label: 'Gen' },
  { id: 'characters', icon: <Users size={20} />, label: 'Chars' },
];

export function MobileBottomNav({ genSidebarOpen, onToggleGenSidebar }: MobileBottomNavProps) {
  const sectionId = useNavStore((s) => s.sectionId);
  const openSection = useNavStore((s) => s.openSection);
  const charactersOpen = useNavStore((s) => s.charactersOpen);
  const toggleCharacters = useNavStore((s) => s.toggleCharacters);

  const handleItemClick = (item: NavItem) => {
    if (item.id === 'generation') {
      onToggleGenSidebar();
    } else if (item.id === 'characters') {
      toggleCharacters();
    } else {
      openSection(item.id as SectionId);
    }
  };

  const isActive = (item: NavItem) => {
    if (item.id === 'generation') return genSidebarOpen;
    if (item.id === 'characters') return charactersOpen;
    return sectionId === item.id;
  };

  return (
    <nav className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 safe-area-bottom border-t backdrop-blur-md">
      <div className="flex items-center justify-around px-2 py-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleItemClick(item)}
            className={cn(
              'touch-target flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2 transition-colors',
              isActive(item) ? 'text-ember' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-label={item.label}
            aria-current={isActive(item) ? 'page' : undefined}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
