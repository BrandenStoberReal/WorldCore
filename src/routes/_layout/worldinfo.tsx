import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Loader2,
  Plus,
  Trash2,
  Search,
  Pencil,
  Hash,
  Layers,
  GripVertical,
} from "lucide-react";
import type { WorldInfo, WorldInfoEntry } from "@/shared/types/worldinfo";

interface FormState {
  key: string;
  keysecondary: string;
  content: string;
  comment: string;
  depth: number;
  probability: number;
  constant: boolean;
  selective: boolean;
  enabled: boolean;
}

const emptyForm = (): FormState => ({
  key: "",
  keysecondary: "",
  content: "",
  comment: "",
  depth: 0,
  probability: 1,
  constant: false,
  selective: false,
  enabled: true,
});

export function Component() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editUid, setEditUid] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteUid, setDeleteUid] = useState<string | null>(null);

  const { data: worldinfos, isLoading, error } = useQuery<WorldInfo[]>({
    queryKey: ["/api/v1/worldinfo/all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/worldinfo/all");
      if (!res.ok) throw new Error("Failed to fetch world info");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.results ?? data.data ?? data);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { entries: Record<string, WorldInfoEntry> }) => {
      const res = await fetch("/api/v1/worldinfo/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create world info");
      const result = await res.json();
      return Array.isArray(result) ? result : (result.results ?? result.data ?? result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/worldinfo/all"] });
      setModalOpen(false);
      setForm(emptyForm());
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      fileId,
      entries,
    }: {
      fileId: string;
      entries: Record<string, WorldInfoEntry>;
    }) => {
      const res = await fetch("/api/v1/worldinfo/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId, entries }),
      });
      if (!res.ok) throw new Error("Failed to update world info");
      const result = await res.json();
      return Array.isArray(result) ? result : (result.results ?? result.data ?? result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/worldinfo/all"] });
      setModalOpen(false);
      setEditUid(null);
      setForm(emptyForm());
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async ({
      fileId,
      uid,
    }: {
      fileId: string;
      uid: string;
    }) => {
      const res = await fetch("/api/v1/worldinfo/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId, entries: [uid] }),
      });
      if (!res.ok) throw new Error("Failed to delete world info entry");
      const result = await res.json();
      return Array.isArray(result) ? result : (result.results ?? result.data ?? result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/worldinfo/all"] });
    },
  });

  const allEntries = worldinfos?.flatMap((wi) =>
    Object.entries(wi.entries).map(([uid, entry]) => ({
      ...entry,
      uid,
      wiName: wi.name,
      wiFileId: wi.name,
    }))
  );

  const filtered = allEntries?.filter(
    (e) =>
      e.key.toLowerCase().includes(search.toLowerCase()) ||
      e.content.toLowerCase().includes(search.toLowerCase()) ||
      e.keysecondary.some((k) =>
        k.toLowerCase().includes(search.toLowerCase())
      )
  );

  const handleSave = () => {
    const uid = editUid ?? crypto.randomUUID();
    const entry: WorldInfoEntry = {
      uid,
      key: form.key,
      keysecondary: form.keysecondary
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      comment: form.comment,
      content: form.content,
      constant: form.constant,
      vectorized: false,
      selective: form.selective,
      selectiveLogic: 0,
      addMemo: false,
      order: 0,
      position: 0,
      disable: !form.enabled,
      excludeRecursion: false,
      preventRecursion: false,
      delayUntilRecursion: false,
      probability: form.probability,
      useProbability: false,
      depth: form.depth,
      group: 0,
      groupOverride: false,
      groupWeight: 1,
      scanDepth: 0,
      caseSensitive: false,
      matchWholeWords: false,
      automationId: "",
      role: "",
      sticky: false,
      cooldown: 0,
      delay: 0,
      matchPersonaDescription: false,
      matchCharacterDescription: false,
      matchCharacterPersonality: false,
      matchCharacterDepthPrompt: false,
      matchScenario: false,
      matchCreatorNotes: false,
      triggers: "",
      ignoreBudget: false,
    };

    if (editUid) {
      const wi = worldinfos?.find((w) =>
        Object.keys(w.entries).includes(editUid)
      );
      if (wi) {
        updateMutation.mutate({
          fileId: wi.name,
          entries: { [uid]: entry },
        });
      }
    } else {
      createMutation.mutate({ entries: { [uid]: entry } });
    }
  };

  const openEdit = (entry: (WorldInfoEntry & { uid: string }) & { wiName: string; wiFileId: string }) => {
    setEditUid(entry.uid);
    setForm({
      key: entry.key,
      keysecondary: entry.keysecondary.join(", "),
      content: entry.content,
      comment: entry.comment,
      depth: entry.depth,
      probability: entry.probability,
      constant: entry.constant,
      selective: entry.selective,
      enabled: !entry.disable,
    });
    setModalOpen(true);
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
        <p className="text-destructive">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">World Info</h2>
          <p className="text-muted-foreground">
            {filtered?.length ?? 0} of {allEntries?.length ?? 0} entries
          </p>
        </div>
        <Button
          onClick={() => {
            setEditUid(null);
            setForm(emptyForm());
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          New Entry
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by keyword or content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-3">
        {filtered?.map((entry) => (
          <Card key={entry.uid} className="transition-shadow hover:shadow-md">
            <CardHeader className="flex-row items-center gap-3 pb-2">
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base">{entry.key}</CardTitle>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  Depth: {entry.depth}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {entry.keysecondary.length} keywords
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEdit(entry)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  onClick={() =>
                    setDeleteUid(entry.uid)
                  }
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {entry.content || "No content"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No world info entries found.</p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditUid(null);
          setForm(emptyForm());
        }}
        title={editUid ? "Edit Entry" : "New Entry"}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Keywords (comma separated)</Label>
            <Input
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              placeholder="Main keyword"
            />
          </div>
          <div className="space-y-2">
            <Label>Secondary Keywords (comma separated)</Label>
            <Input
              value={form.keysecondary}
              onChange={(e) =>
                setForm({ ...form, keysecondary: e.target.value })
              }
              placeholder="Secondary keywords"
            />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Entry content"
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Comment</Label>
            <Input
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              placeholder="Optional comment"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Depth</Label>
              <Input
                type="number"
                value={form.depth}
                onChange={(e) =>
                  setForm({ ...form, depth: parseInt(e.target.value, 10) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Probability</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={form.probability}
                onChange={(e) =>
                  setForm({
                    ...form,
                    probability: parseFloat(e.target.value) ?? 1,
                  })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.constant}
                onChange={(e) =>
                  setForm({ ...form, constant: e.target.checked })
                }
              />
              Constant (always active)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.selective}
                onChange={(e) =>
                  setForm({ ...form, selective: e.target.checked })
                }
              />
              Selective
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) =>
                  setForm({ ...form, enabled: e.target.checked })
                }
              />
              Enabled
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                setEditUid(null);
                setForm(emptyForm());
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.key.trim()}
            >
              {editUid ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteUid}
        onClose={() => setDeleteUid(null)}
        onConfirm={() => {
          if (deleteUid) {
            const entry = allEntries?.find((e) => e.uid === deleteUid);
            if (entry) {
              deleteMutation.mutate({
                fileId: entry.wiFileId,
                uid: deleteUid,
              });
            }
          }
        }}
        title="Delete Entry"
        message="Are you sure you want to delete this world info entry?"
        confirmLabel="Delete"
      />
    </div>
  );
}
