import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { useChatStore } from '@/lib/stores';
import { useNavStore } from '@/lib/navStore';
import { CharacterForm, type CharacterFormHandle } from '@/components/CharacterForm';
import { cn } from '@/lib/utils';
import type { Character, CharacterCreateInput } from '@/shared/types/character';

type CharacterWithId = Character & { id: number };

function PanelHeader({
  mode,
  characterName,
  action,
}: {
  mode: 'create' | 'edit';
  characterName?: string;
  action?: React.ReactNode;
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
      <div className="flex items-center gap-2">
        {action}
      </div>
    </header>
  );
}

function CreateMode() {
  const queryClient = useQueryClient();
  const openSection = useNavStore((s) => s.openSection);

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
        <div className="mx-auto max-w-4xl">
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
      queryClient.invalidateQueries({ queryKey: ['/api/v1/characters/get', characterId] });
    },
  });

  const handleExit = () => {
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

  const formRef = useRef<CharacterFormHandle>(null);

  const doneButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => formRef.current?.submit()}
      className="h-7 gap-1.5"
    >
      <Check className="h-3.5 w-3.5" />
      <span className="mono-tag">DONE</span>
    </Button>
  );

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        mode="edit"
        characterName={editCharacter.name}
        action={doneButton}
      />
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-4xl">
          <CharacterForm
            ref={formRef}
            character={editCharacter}
            onSubmit={async (data) => {
              await editMutation.mutateAsync({ id: editCharacter.id, data });
              handleExit();
            }}
            onCancel={handleExit}
            isSubmitting={editMutation.isPending}
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
