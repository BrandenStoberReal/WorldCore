import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CharacterForm } from '@/components/CharacterForm';
import { CharacterCard } from '@/components/CharacterCard';
import { Plus, Search, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useChatStore } from '@/lib/stores';
import { cn, surfaceCard } from '@/lib/utils';
import type { ShallowCharacter, Character, CharacterCreateInput } from '@/shared/types/character';

type CharacterWithId = Character & { id: number };

export function CharactersPanel() {
  const queryClient = useQueryClient();
  const setActiveCharacter = useChatStore((s) => s.setActiveCharacter);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const {
    data: characters,
    isLoading,
    error,
  } = useQuery<ShallowCharacter[]>({
    queryKey: ['/api/v1/characters/all', 'shallow'],
    queryFn: () =>
      apiFetch('/characters/all', {
        method: 'POST',
        body: JSON.stringify({ shallow: true }),
      }) as Promise<ShallowCharacter[]>,
  });

  const { data: editCharacter } = useQuery<CharacterWithId>({
    queryKey: ['/api/v1/characters/get', editId],
    queryFn: async () => {
      if (editId == null) throw new Error('No edit ID');
      return apiFetch('/characters/get', {
        method: 'POST',
        body: JSON.stringify({ id: editId }),
      }) as Promise<CharacterWithId>;
    },
    enabled: editId != null,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CharacterCreateInput & { avatar?: string }) => {
      return apiFetch('/characters/create', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/characters/all'] });
      setCreateOpen(false);
    },
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
      setEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiFetch('/characters/delete', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/characters/all'] });
    },
  });

  const filtered = characters?.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q));
  });

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="text-ember h-7 w-7 animate-spin" />
        <span className="mono-tag text-muted-foreground/55">retrieving characters</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          surfaceCard,
          'border-destructive/40 flex h-64 flex-col items-center justify-center gap-2 p-8',
        )}
      >
        <span className="mono-tag text-destructive">error</span>
        <p className="text-muted-foreground text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  const count = characters?.length ?? 0;
  const fCount = filtered?.length ?? 0;

  return (
    <div data-panel="characters" className="flex h-full flex-col gap-3">
      {/* Section header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <span className="mono-tag text-ember">{`[01] — INDEX`}</span>
            <span className="bg-ember/40 h-px w-10" />
          </div>
          <h2 className="display-host text-[42px] leading-none tracking-tight">Characters</h2>
          <p className="text-muted-foreground mt-2 max-w-md text-sm">
            Character cards with their personalities, scenarios, and opening greetings. Start a chat
            with one click.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreateOpen(true)}
            className="ember-pulse relative h-9 pr-4 pl-3"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            <span className="text-[13px] font-semibold tracking-tight">New Character</span>
          </Button>
        </div>
      </header>

      {/* Search / filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="text-muted-foreground/55 absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            placeholder="search characters..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 font-mono text-[13px] tracking-tight"
          />
          {/* ember hairline under focus */}
          <span
            aria-hidden
            className="via-ember/40 pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent to-transparent opacity-0 transition-opacity focus-within:opacity-100"
          />
        </div>
        <div className="border-border bg-background/40 flex h-9 items-center gap-1.5 rounded-sm border px-3">
          <span className="mono-tag text-muted-foreground/55">filter</span>
          <span className="mono-tag text-ember tabular-nums">
            {String(fCount).padStart(2, '0')}
          </span>
          <span className="mono-tag text-muted-foreground/40">/</span>
          <span className="mono-tag text-foreground/70 tabular-nums">
            {String(count).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered?.map((char, idx) => (
          <CharacterCard
            key={char.id}
            character={char}
            index={idx}
            onSelect={setActiveCharacter}
            onEdit={setEditId}
            onDelete={setDeleteId}
          />
        ))}
      </div>

      {/* Empty state */}
      {fCount === 0 && (
        <Card className={cn(surfaceCard, 'relative overflow-hidden rounded-sm px-6 py-16')}>
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="border-border bg-muted/40 mb-4 flex h-14 w-14 items-center justify-center rounded-sm border">
              <span className="display-host text-ember text-2xl">∅</span>
            </div>
            <h3 className="display-host mb-1 text-xl">
              {count === 0 ? 'No entries' : 'No matches'}
            </h3>
            <p className="mono-tag text-muted-foreground/55">
              {count === 0 ? 'create your first character to begin' : 'no characters match'}
            </p>
            {count === 0 && (
              <Button className="mt-5" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Cast a New Persona
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Character"
        className="max-w-2xl"
      >
        <CharacterForm
          onSubmit={(data) => createMutation.mutate(data)}
          onCancel={() => setCreateOpen(false)}
          isSubmitting={createMutation.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editId != null}
        onClose={() => setEditId(null)}
        title={`Edit · ${editCharacter?.name ?? ''}`}
        className="max-w-2xl"
      >
        {editCharacter && (
          <CharacterForm
            character={editCharacter}
            onSubmit={(data) => editMutation.mutate({ id: editCharacter.id, data })}
            onCancel={() => setEditId(null)}
            isSubmitting={editMutation.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId != null && deleteMutation.mutate(deleteId)}
        title="Condemn to Slag"
        message="Cast this persona into the slag heap? This action is irreversible — the character card will be lost forever."
        confirmLabel="Condemn"
      />
    </div>
  );
}
