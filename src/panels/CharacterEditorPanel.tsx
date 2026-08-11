import { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch, apiPost, bindCharacterPersona } from '@/lib/api';
import { useChatStore } from '@/lib/stores';
import { useNavStore } from '@/lib/navStore';
import { toastSuccess, toastError } from '@/lib/toast';
import { CharacterForm, type CharacterFormHandle } from '@/components/CharacterForm';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
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
      <div className="flex items-center gap-2">{action}</div>
    </header>
  );
}

function CreateMode() {
  const queryClient = useQueryClient();
  const openSection = useNavStore((s) => s.openSection);

  const createMutation = useMutation({
    mutationFn: async (
      data: CharacterCreateInput & { avatar?: string; boundPersonaId?: number | null },
    ) => {
      const result = (await apiFetch('/characters/create', {
        method: 'POST',
        body: JSON.stringify(data),
      })) as { id: number };
      if (data.boundPersonaId != null) {
        await bindCharacterPersona(result.id, data.boundPersonaId);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/characters/all'] });
      toastSuccess('Character created');
      openSection('chats');
    },
    onError: (err) => {
      toastError(err);
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
  const activeChatId = useChatStore((s) => s.activeChatId);
  const messages = useChatStore((s) => s.messages);
  const setMessages = useChatStore((s) => s.setMessages);
  const formRef = useRef<CharacterFormHandle>(null);

  const syncGreetingToSession = async (newFirstMes: string) => {
    if (!activeChatId || messages.length === 0) return;
    const hasUserMessage = messages.some((m) => m.is_user);
    if (hasUserMessage) return;

    const first = messages[0];
    if (!first) return;
    const updatedFirstMsg = {
      name: first.name,
      is_user: first.is_user,
      mes: newFirstMes,
      send_date: new Date().toISOString(),
      extra: first.extra ?? {},
    };
    setMessages([updatedFirstMsg, ...messages.slice(1)]);

    try {
      await apiPost('/chats/message', {
        fileId: activeChatId,
        action: 'edit',
        index: 0,
        updates: updatedFirstMsg,
      });
    } catch (err) {
      console.error('Failed to sync greeting to session:', err);
    }
  };

  const { data: editCharacter, isLoading: charLoading, isError: charError } = useQuery<CharacterWithId>({
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
      data: CharacterCreateInput & { avatar?: string; boundPersonaId?: number | null };
    }) => {
      const editData = { ...data };
      const avatar = editData.avatar;
      const boundPersonaId = editData.boundPersonaId;
      delete (editData as Record<string, unknown>).avatar;
      delete (editData as Record<string, unknown>).boundPersonaId;
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
      await bindCharacterPersona(id, boundPersonaId ?? null);
      return { editData };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/characters/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v1/characters/get', characterId] });
      toastSuccess('Character saved');
      if (result.editData.first_mes != null) {
        await syncGreetingToSession(result.editData.first_mes as string);
      }
    },
    onError: (err) => {
      toastError(err);
    },
  });

  const handleExit = () => {
    openSection('chats');
  };

  if (charLoading || !editCharacter) {
    if (charError) {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center space-y-2">
            <span className="mono-tag text-destructive">Failed to load character</span>
            <p className="text-muted-foreground text-xs">Please try again or select a different character.</p>
          </div>
        </div>
      );
    }
    return <LoadingSpinner size="lg" label="loading character" className="h-full" />;
  }

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
      <PanelHeader mode="edit" characterName={editCharacter.name} action={doneButton} />
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

function EmptyState() {
  const openSection = useNavStore((s) => s.openSection);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="border-border bg-muted/40 flex h-16 w-16 items-center justify-center rounded-full border">
        <User className="text-muted-foreground/55 h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h3 className="display-host text-lg">No character selected</h3>
        <p className="text-muted-foreground/55 max-w-sm text-sm">
          Select a character from the sidebar to edit its details, or create a new one.
        </p>
      </div>
      <Button size="sm" onClick={() => openSection('characters')}>
        Create New
      </Button>
    </div>
  );
}

export function CharacterEditorPanel() {
  const activeCharacterId = useChatStore((s) => s.activeCharacterId);

  return (
    <div
      data-panel="character-editor"
      className="bg-background flex h-full w-full flex-1 flex-col overflow-hidden"
    >
      {activeCharacterId == null ? (
        <EmptyState />
      ) : (
        <EditMode key={activeCharacterId} characterId={activeCharacterId} />
      )}
    </div>
  );
}
