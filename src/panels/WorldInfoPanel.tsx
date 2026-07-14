import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Loader2,
  Plus,
  Trash2,
  Search,
  Pencil,
  Layers,
  Hash,
  Flame,
} from "lucide-react";
import { cn, surfaceCard } from "@/lib/utils";
import { InlineSection } from "@/components/drawers/InlineSection";
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

export function WorldInfoPanel() {
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

  const openEdit = (entry: WorldInfoEntry & { uid: string; wiName: string; wiFileId: string }) => {
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
      <div className="flex items-center justify-center h-64 flex-col gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-ember" />
        <span className="mono-tag text-muted-foreground/55">
          scanning tablets
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          surfaceCard,
          "flex items-center justify-center h-64",
        )}
      >
        <span className="mono-tag text-destructive">{error.message}</span>
      </div>
    );
  }

  return (
    <div data-panel="worldinfo" className="relative isolate section-rhythm">
      {/* Section header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="mono-tag text-ember">{`[03] — ARCHIVE`}</span>
            <span className="h-px w-10 bg-ember/40" />
          </div>
          <h2
            className="display-host text-[42px] leading-none tracking-tight"
          >
            Lore Tablets
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Triggered knowledge fragments: keys, secondary keywords, depth, and
            probability gating the lore the model can summon mid-conversation.
          </p>
        </div>

        <Button
          onClick={() => {
            setEditUid(null);
            setForm(emptyForm());
            setModalOpen(true);
          }}
          className="h-9 ember-pulse"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          <span className="text-[13px] font-semibold tracking-tight">
            New Tablet
          </span>
        </Button>
      </header>

      {/* Search rail */}
      <InlineSection panelId="worldinfo" sectionId="search" title="Search & Filter">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/55" />
            <Input
              placeholder="query · key, secondary, or content fragment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 font-mono text-[13px] tracking-tight"
            />
          </div>
          <div className="flex items-center gap-1.5 h-9 px-3 border border-border bg-background/40 rounded-sm">
            <span className="mono-tag text-muted-foreground/55">tablets</span>
            <span className="mono-tag text-ember tabular-nums">
              {String(filtered?.length ?? 0).padStart(2, "0")}
            </span>
            <span className="mono-tag text-muted-foreground/40">/</span>
            <span className="mono-tag text-foreground/70 tabular-nums">
              {String(allEntries?.length ?? 0).padStart(2, "0")}
            </span>
          </div>
        </div>
      </InlineSection>

      {/* Entry list */}
      <div className="grid gap-4">
        {filtered?.map((entry, idx) => (
          <Card
            key={entry.uid}
            className={cn(
              surfaceCard,
              "group relative rounded-sm py-0 overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-12px_color-mix(in_oklch,var(--ember)_45%,transparent)]",
              entry.disable ? "opacity-55" : "",
            )}
          >
            {/* Top rail */}
            <div className="flex items-center justify-between px-4 py-2 bg-background/30 border-b border-border/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="mono-tag text-muted-foreground/55 tabular-nums">
                  {`#${String(idx + 1).padStart(3, "0")}`}
                </span>
                <span className="mono-tag text-ember/70 truncate">
                  {entry.key || "{no_key}"}
                </span>
                {!entry.disable && (
                  <span className="mono-tag px-1.5 py-0.5 rounded-sm bg-ember/15 text-ember">
                    ON
                  </span>
                )}
                {entry.disable && (
                  <span className="mono-tag px-1.5 py-0.5 rounded-sm bg-muted/50 text-muted-foreground/55">
                    OFF
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEdit(entry)}
                  className="h-7 w-7 hover:text-ember"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteUid(entry.uid)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <CardContent className="px-4 py-3 space-y-3">
              {/* Card body */}
              <p className="text-[13.5px] leading-relaxed text-foreground/80 line-clamp-2">
                {entry.content || (
                  <span className="italic text-muted-foreground/40">
                    no content inscribed
                  </span>
                )}
              </p>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-3">
                <Badge label="DEPTH" value={String(entry.depth)} icon={Layers} />
                <Badge
                  label="PROB"
                  value={entry.probability.toFixed(2)}
                  icon={Flame}
                  accent
                />
                <Badge
                  label="KEYS"
                  value={String(entry.keysecondary.length)}
                  icon={Hash}
                />
                <Badge
                  label="MODE"
                  value={
                    entry.constant ? "CONST" : entry.selective ? "SELECT" : "TRIG"
                  }
                />
                {entry.comment && (
                  <span className="mono-tag text-muted-foreground/55 truncate min-w-0 ml-auto">
                    {entry.comment}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered?.length === 0 && (
        <Card
          className={cn(
            surfaceCard,
            "relative overflow-hidden rounded-sm py-16 px-6",
          )}
        >
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-border bg-muted/40 mb-4">
              <span className="display-host text-ember text-2xl">∅</span>
            </div>
            <h3 className="display-host text-xl mb-1">Archive empty</h3>
            <p className="mono-tag text-muted-foreground/55">
              inscribe your first lore tablet
            </p>
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
        title={editUid ? "Reinscribe Tablet" : "Inscribe Tablet"}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <FieldRow label="KEYWORDS">
            <Input
              value={form.key}
              onChange={(e) => setForm({ ...form, key: e.target.value })}
              placeholder="primary trigger key"
              className="font-mono text-[13px]"
            />
          </FieldRow>
          <FieldRow label="SECONDARY (comma sep)">
            <Input
              value={form.keysecondary}
              onChange={(e) =>
                setForm({ ...form, keysecondary: e.target.value })
              }
              placeholder="secondary keys"
              className="font-mono text-[13px]"
            />
          </FieldRow>
          <FieldRow label="CONTENT">
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="the lore this tablet will inject when triggered"
              rows={5}
              className="text-[13px]"
            />
          </FieldRow>
          <FieldRow label="COMMENT">
            <Input
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              placeholder="optional note"
              className="text-[13px]"
            />
          </FieldRow>

          <div className="grid grid-cols-2 gap-4">
            <FieldRow label="DEPTH">
              <Input
                type="number"
                value={form.depth}
                onChange={(e) =>
                  setForm({ ...form, depth: parseInt(e.target.value, 10) || 0 })
                }
                className="font-mono"
              />
            </FieldRow>
            <FieldRow label="PROBABILITY">
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
                className="font-mono"
              />
            </FieldRow>
          </div>

          <div className="space-y-2 pt-1">
            <ToggleRow
              label="Constant"
              caption="always injected regardless of triggers"
              checked={form.constant}
              onChange={(v) => setForm({ ...form, constant: v })}
            />
            <ToggleRow
              label="Selective"
              caption="requires secondary keys to match"
              checked={form.selective}
              onChange={(v) => setForm({ ...form, selective: v })}
            />
            <ToggleRow
              label="Enabled"
              caption="tablet is active and available"
              checked={form.enabled}
              onChange={(v) => setForm({ ...form, enabled: v })}
              ember
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false);
                setEditUid(null);
                setForm(emptyForm());
              }}
            >
              <span className="mono-tag">cancel</span>
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.key.trim()}
            >
              <span className="mono-tag">
                {editUid ? "UPDATE" : "INSCRIBE"}
              </span>
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
        title="Condemn Tablet"
        message="Cast this lore tablet into the slag heap? This action cannot be undone."
        confirmLabel="Condemn"
      />
    </div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="mono-tag text-muted-foreground/70">{label}</label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  caption,
  checked,
  onChange,
  ember,
}: {
  label: string;
  caption?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  ember?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full px-3 py-2 rounded-sm border border-border bg-background/40 hover:bg-accent/30 transition-colors text-left"
    >
      <div className="flex flex-col">
        <span className="text-[13px] font-medium">{label}</span>
        {caption && (
          <span className="mono-tag text-muted-foreground/55 mt-0.5">
            {caption}
          </span>
        )}
      </div>
      <span
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
          checked
            ? ember
              ? "bg-ember"
              : "bg-foreground/70"
            : "bg-muted",
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition-transform",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}

function Badge({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border text-[11px]",
        accent
          ? "border-ember/40 bg-ember/10 text-ember"
          : "border-border bg-muted/40 text-foreground/70",
      )}
    >
      <span className="mono-tag opacity-70">{label}</span>
      {Icon && <Icon className="h-3 w-3 opacity-70" />}
      <span className="mono-tag font-bold tabular-nums">{value}</span>
    </span>
  );
}
