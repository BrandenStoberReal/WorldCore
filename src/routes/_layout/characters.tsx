import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CharacterForm } from "@/components/CharacterForm";
import { CharacterCard } from "@/components/CharacterCard";
import { Plus, Search, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useChatStore } from "@/lib/stores";
import { cn, hammeredPlate } from "@/lib/utils";
import type { ShallowCharacter, Character, CharacterCreateInput } from "@/shared/types/character";

type CharacterWithId = Character & { id: number };

export function Component() {
  const queryClient = useQueryClient();
  const setActiveCharacter = useChatStore((s) => s.setActiveCharacter);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: characters, isLoading, error } = useQuery<ShallowCharacter[]>({
    queryKey: ["/api/v1/characters/all", "shallow"],
    queryFn: () => apiFetch("/characters/all", {
      method: "POST",
      body: JSON.stringify({ shallow: true }),
    }) as Promise<ShallowCharacter[]>,
  });

  const { data: editCharacter } = useQuery<CharacterWithId>({
    queryKey: ["/api/v1/characters/get", editId],
    queryFn: async () => {
      if (editId == null) throw new Error("No edit ID");
      return apiFetch("/characters/get", {
        method: "POST",
        body: JSON.stringify({ id: editId }),
      }) as Promise<CharacterWithId>;
    },
    enabled: editId != null,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CharacterCreateInput & { avatar?: string }) => {
      return apiFetch("/characters/create", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/characters/all"] });
      setCreateOpen(false);
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CharacterCreateInput & { avatar?: string } }) => {
      const editData = { ...data };
      const avatar = editData.avatar;
      delete (editData as Record<string, unknown>).avatar;

      await apiFetch("/characters/edit", {
        method: "POST",
        body: JSON.stringify({ id, data: editData }),
      });

      if (avatar) {
        await apiFetch("/characters/edit-avatar", {
          method: "POST",
          body: JSON.stringify({ id, avatar }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/characters/all"] });
      setEditId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiFetch("/characters/delete", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/characters/all"] });
    },
  });

  const filtered = characters?.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 flex-col gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-ember" />
        <span className="mono-tag text-muted-foreground/55">
          retrieving personae
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          hammeredPlate,
          "flex items-center justify-center h-64 flex-col gap-2 p-8 border-destructive/40",
        )}
      >
        <span className="mono-tag text-destructive">forge fault</span>
        <p className="text-sm text-muted-foreground">
          {(error as Error).message}
        </p>
      </div>
    );
  }

  const count = characters?.length ?? 0;
  const fCount = filtered?.length ?? 0;

  return (
    <div className="relative space-y-7">
      {/* Section header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="mono-tag text-ember">{`[01] — INDEX`}</span>
            <span className="h-px w-10 bg-ember/40" />
          </div>
          <h2
            className="display-host text-[42px] leading-none tracking-tight"
          >
            Personae
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Forged character cards with their personalities, scenarios, and
            opening greetings. Stoking one for chat is one click away.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreateOpen(true)}
            className="relative pl-3 pr-4 h-9 ember-pulse"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            <span className="text-[13px] font-semibold tracking-tight">
              Forge New
            </span>
          </Button>
        </div>
      </header>

      {/* Search / filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/55" />
          <Input
            placeholder="query personae · name, tag, persona fragment..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 font-mono text-[13px] tracking-tight"
          />
          {/* ember hairline under focus */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-ember/40 to-transparent opacity-0 focus-within:opacity-100 transition-opacity"
          />
        </div>
        <div className="flex items-center gap-1.5 h-9 px-3 border border-border bg-background/40 rounded-sm">
          <span className="mono-tag text-muted-foreground/55">filter</span>
          <span className="mono-tag text-ember tabular-nums">
            {String(fCount).padStart(2, "0")}
          </span>
          <span className="mono-tag text-muted-foreground/40">/</span>
          <span className="mono-tag text-foreground/70 tabular-nums">
            {String(count).padStart(2, "0")}
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
        <Card
          className={cn(
            hammeredPlate,
            "relative overflow-hidden rounded-sm py-16",
          )}
        >
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-border bg-muted/40 mb-4">
              <span className="display-host text-ember text-2xl">∅</span>
            </div>
            <h3 className="display-host text-xl mb-1">
              {count === 0 ? "Forge empty" : "No matches"}
            </h3>
            <p className="mono-tag text-muted-foreground/55">
              {count === 0
                ? "forge your first persona to begin"
                : "no personae satisfy your query"}
            </p>
            {count === 0 && (
              <Button
                className="mt-5"
                onClick={() => setCreateOpen(true)}
              >
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
        title="Forge New Persona"
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
        title={`Reforge · ${editCharacter?.name ?? ""}`}
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
