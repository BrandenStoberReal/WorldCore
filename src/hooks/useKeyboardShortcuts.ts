import { useEffect } from 'react';
import { useNavStore, type SectionId } from '@/lib/navStore';

const SECTION_SHORTCUTS: Record<string, SectionId> = {
  '1': 'chats',
  '2': 'characters',
  '3': 'lorebook',
  '4': 'worldinfo',
  '5': 'extensions',
  '6': 'connections',
  '7': 'settings',
};

export function useKeyboardShortcuts() {
  const openSection = useNavStore((s) => s.openSection);
  const toggleCharacters = useNavStore((s) => s.toggleCharacters);
  const toggleGenSidebar = useNavStore((s) => s.toggleGenSidebar);
  const closeTopDrawer = useNavStore((s) => s.closeTopDrawer);
  const closeCharacters = useNavStore((s) => s.closeCharacters);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isAlt = e.altKey;
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (isCtrl && e.key === 'n') {
        e.preventDefault();
        openSection('characters');
        return;
      }

      if (isCtrl && e.key === 'b') {
        e.preventDefault();
        toggleCharacters();
        return;
      }

      if (isCtrl && e.key === 'g') {
        e.preventDefault();
        toggleGenSidebar();
        return;
      }

      if (isAlt && !isInput) {
        const section = SECTION_SHORTCUTS[e.key];
        if (section) {
          e.preventDefault();
          openSection(section);
          return;
        }
      }

      if (e.key === 'Escape') {
        if (!isInput) {
          closeTopDrawer();
          closeCharacters();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openSection, toggleCharacters, toggleGenSidebar, closeTopDrawer, closeCharacters]);
}
