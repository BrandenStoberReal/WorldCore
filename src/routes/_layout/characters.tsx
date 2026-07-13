import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CharacterForm } from "@/components/CharacterForm";
import { CharacterCard } from "@/components/CharacterCard";
import { Loader2, Plus, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useChatStore } from "@/lib/stores";
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

  const handleSelect = (id: number) => {
    setActiveCharacter(id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Characters</h2>
          <p className="text-muted-foreground">
            {filtered?.length ?? 0} of {characters?.length ?? 0} characters
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create Character
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered?.map((char) => (
          <CharacterCard
            key={char.id}
            character={char}
            onSelect={handleSelect}
            onEdit={setEditId}
            onDelete={setDeleteId}
          />
        ))}
      </div>

      {filtered?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              {characters?.length === 0
                ? "No characters yet. Create one to get started."
                : "No characters match your search."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Character"
        className="max-w-xl"
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
        title={`Edit ${editCharacter?.name ?? ""}`}
        className="max-w-xl"
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
        title="Delete Character"
        message="Are you sure you want to delete this character? This action cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}
