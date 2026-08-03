import { useNavStore, type SectionId } from '@/lib/navStore';
import { ChatsPanel } from '@/panels/ChatsPanel';
import { CharactersPanel } from '@/panels/CharactersPanel';
import { CharacterEditorPanel } from '@/panels/CharacterEditorPanel';
import { LorebookPanel } from '@/panels/LorebookPanel';
import { CharacterBrowserPanel } from '@/panels/CharacterBrowserPanel';

const CENTER_SECTIONS: Partial<Record<SectionId, React.ComponentType>> = {
  chats: ChatsPanel,
  characters: CharactersPanel,
  'character-editor': CharacterEditorPanel,
  lorebook: LorebookPanel,
  'character-browser': CharacterBrowserPanel,
};

export function CenterPageHost() {
  const sectionId = useNavStore((s) => s.sectionId);
  const Panel = CENTER_SECTIONS[sectionId];

  if (!Panel) {
    return (
      <main data-center-host className="flex-1 overflow-auto scroll-mobile">
        <div className="text-muted-foreground/45 flex h-full items-center justify-center">
          Select a section from the top bar
        </div>
      </main>
    );
  }

  return (
    <main data-center-host className="flex-1 overflow-auto scroll-mobile">
      <Panel />
    </main>
  );
}
