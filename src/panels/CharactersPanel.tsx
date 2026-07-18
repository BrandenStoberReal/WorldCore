import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, RotateCcw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useChatStore } from '@/lib/stores';
import { useNavStore } from '@/lib/navStore';
import { CharacterForm } from '@/components/CharacterForm';
import { useDebouncedAutoSave } from '@/hooks';
import { cn } from '@/lib/utils';
import type { ShallowCharacter, Character, CharacterCreateInput } from '@/shared/types/character';

type CharacterWithId = Character & { id: number };

const EMPTY_DRAFT: CharacterCreateInput = {
  name: '',
  description: '',
  personality: '',
  scenario: '',
  first_mes: '',
  mes_example: '',
  creator_notes: '',
  system_prompt: '',
  post_history_instructions: '',
  tags: [],
  creator: '',
  character_version: '',
  alternate_greetings: [],
  source: [],
  group_only_greetings: [],
  assets: [],
};

function mapEditCharacterToDraft(c: CharacterWithId): CharacterCreateInput {
  const ext = c.extensions as Record<string, unknown> | undefined;
  return {
    name: c.name,
    description: c.description ?? '',
    personality: c.personality ?? '',
    scenario: c.scenario ?? '',
    first_mes: c.first_mes ?? '',
    mes_example: c.mes_example ?? '',
    creator_notes: c.creator_notes ?? '',
    system_prompt: c.system_prompt ?? '',
    post_history_instructions: c.post_history_instructions ?? '',
    tags: c.tags ?? [],
    creator: c.creator ?? '',
    character_version: c.character_version ?? '',
    alternate_greetings: c.alternate_greetings ?? [],
    extensions: ext,
    nickname: c.nickname,
    creator_notes_multilingual: c.creator_notes_multilingual,
    source: c.source ?? [],
    group_only_greetings: c.group_only_greetings ?? [],
    assets: c.assets ?? [],
    creation_date: c.creation_date,
    modification_date: c.modification_date,
  };
}

function PanelHeader({
  mode,
  characterName,
  statusBadge,
}: {
  mode: 'create' | 'edit';
  characterName?: string;
  statusBadge?: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-2',
        'border-border/40 border-b',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="mono-tag text-ember">
          {mode === 'create' ? '[NEW] · FORGE' : '[EDIT] · FORGE'}
        </span>
        <span className="bg-border/50 h-px w-6" />
        <h2 className="display-host text-[14px] leading-none tracking-tight">
          {mode === 'create' ? (
            <>
              Cast a <span className="text-ember italic">persona</span>
            </>
          ) : (
            <span className="truncate">{characterName ?? 'Edit character'}</span>
          )}
        </h2>
      </div>
      {statusBadge}
    </header>
  );
}

function CreateMode() {
  const queryClient = useQueryClient();
  const openSection = useNavStore((s) => s.openSection);
  const setActiveCharacter = useChatStore((s) => s.setActiveCharacter);

  const createMutation = useMutation({
    mutationFn: async (data: CharacterCreateInput & { avatar?: string }) => {
      return apiFetch('/characters/create', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/characters/all'] });
      openSection('chats');
    },
  });

  return (
    <div className="flex h-full flex-col">
      <PanelHeader mode="create" />
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <CharacterForm
            onSubmit={(data) => createMutation.mutate(data)}
            onCancel={() => openSection('chats')}
            isSubmitting={createMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}

function EditMode({ characterId }: { characterId: number }) {
  const queryClient = useQueryClient();
  const openSection = useNavStore((s) => s.openSection);
  const setActiveCharacter = useChatStore((s) => s.setActiveCharacter);

  const { data: editCharacter, isLoading: charLoading } = useQuery<CharacterWithId>({
    queryKey: ['/api/v1/characters/get', characterId],
    queryFn: () =>
      apiFetch('/characters/get', {
        method: 'POST',
        body: JSON.stringify({ id: characterId }),
      }) as Promise<CharacterWithId>,
  });

  const editMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: CharacterCreateInput & { avatar?: string };
    }) => {
      const editData = { ...data };
      const avatar = editData.avatar;
      delete (editData as Record<string, unknown>).avatar;
      await apiFetch('/characters/edit', {
        method: 'POST',
        body: JSON.stringify({ id, data: editData }),
      });
      if (avatar) {
        await apiFetch('/characters/edit-avatar', {
          method: 'POST',
          body: JSON.stringify({ id, avatar }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/characters/all'] });
    },
  });

  const editDraft = useMemo(
    () => (editCharacter ? mapEditCharacterToDraft(editCharacter) : null),
    [editCharacter],
  );

  const autosave = useDebouncedAutoSave({
    value: editDraft ?? EMPTY_DRAFT,
    save: (draft) =>
      editCharacter
        ? editMutation.mutateAsync({ id: editCharacter.id, data: draft })
        : Promise.resolve(),
    delayMs: 800,
  });

  const handleExit = () => {
    void autosave.flush();
    setActiveCharacter(null);
    openSection('chats');
  };

  if (charLoading || !editCharacter) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Loader2 className="text-ember h-6 w-6 animate-spin" />
        <span className="mono-tag text-muted-foreground/55">loading character</span>
      </div>
    );
  }

  const statusBadge =
    autosave.status !== 'idle' ? (
      <span
        className={cn(
          'mono-tag text-[10px]',
          autosave.status === 'error' ? 'text-destructive' : 'text-muted-foreground/40',
        )}
      >
        {autosave.status}
      </span>
    ) : null;

  return (
    <div className="flex h-full flex-col">
      <PanelHeader mode="edit" characterName={editCharacter.name} statusBadge={statusBadge} />
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <CharacterForm
            character={editCharacter}
            onSubmit={(data) =>
              editMutation.mutate({ id: editCharacter.id, data }, { onSuccess: handleExit })
            }
            onCancel={handleExit}
            isSubmitting={editMutation.isPending}
            onChange={(draft) => autosave.setLocal(draft)}
            saveStatus={autosave.status}
          />
        </div>
      </div>
    </div>
  );
}

export function CharactersPanel() {
  const activeCharacterId = useChatStore((s) => s.activeCharacterId);

  return (
    <div
      data-panel="characters"
      className="bg-background flex h-full w-full flex-1 flex-col overflow-hidden"
    >
      {activeCharacterId == null ? <CreateMode /> : <EditMode characterId={activeCharacterId} />}
    </div>
  );
}
