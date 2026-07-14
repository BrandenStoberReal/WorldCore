import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ConnectionProfileForm } from "@/components/ConnectionProfileForm";
import { ConnectionProfileCard } from "@/components/ConnectionProfileCard";
import { Plus, Search, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { cn, surfaceCard } from "@/lib/utils";
import type { ConnectionProfile } from "@/shared/schemas/connection-profile";

export function Component() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<ConnectionProfile | null>(null);
  const [deleteProfile, setDeleteProfile] = useState<ConnectionProfile | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch all connection profiles
  const { data: profiles, isLoading, error } = useQuery<ConnectionProfile[]>({
    queryKey: ["/api/v1/connection-profiles/all"],
    queryFn: () =>
      apiFetch("/connection-profiles/all", {
        method: "POST",
        body: JSON.stringify({}),
      }) as Promise<ConnectionProfile[]>,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: ConnectionProfile) => {
      return apiFetch("/connection-profiles/create", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/connection-profiles/all"] });
      setCreateOpen(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: ConnectionProfile) => {
      return apiFetch("/connection-profiles/update", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/connection-profiles/all"] });
      setEditProfile(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch("/connection-profiles/delete", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/connection-profiles/all"] });
    },
  });

  const filtered = profiles?.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.api.toLowerCase().includes(q) ||
      p.model.toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 flex-col gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-ember" />
        <span className="mono-tag text-muted-foreground/55">
          retrieving connection profiles
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          surfaceCard,
          "flex items-center justify-center h-64 flex-col gap-2 p-8 border-destructive/40",
        )}
      >
        <span className="mono-tag text-destructive">error</span>
        <p className="text-sm text-muted-foreground">
          {(error as Error).message}
        </p>
      </div>
    );
  }

  const count = profiles?.length ?? 0;
  const fCount = filtered?.length ?? 0;

  return (
    <div className="relative space-y-7">
      {/* Section header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="mono-tag text-ember">{`[06] — LINKS`}</span>
            <span className="h-px w-10 bg-ember/40" />
          </div>
          <h2 className="display-host text-[42px] leading-none tracking-tight">
            Connection Profiles
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            API link profiles for backends, models, and generation presets.
            Switch connections with a single click.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreateOpen(true)}
            className="relative pl-3 pr-4 h-9 ember-pulse"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            <span className="text-[13px] font-semibold tracking-tight">
              New Profile
            </span>
          </Button>
        </div>
      </header>

      {/* Search / filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/55" />
          <Input
            placeholder="query profiles · name, api, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 font-mono text-[13px] tracking-tight"
          />
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
        {filtered?.map((profile, idx) => (
          <ConnectionProfileCard
            key={profile.id}
            profile={profile}
            index={idx}
            isSelected={selectedId === profile.id}
            onSelect={(p) => setSelectedId(p.id === selectedId ? null : p.id)}
            onEdit={setEditProfile}
            onDelete={setDeleteProfile}
          />
        ))}
      </div>

      {/* Empty state */}
      {fCount === 0 && (
        <Card
          className={cn(
            surfaceCard,
            "relative overflow-hidden rounded-sm py-16",
          )}
        >
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-border bg-muted/40 mb-4">
              <span className="display-host text-ember text-2xl">∅</span>
            </div>
            <h3 className="display-host text-xl mb-1">
              {count === 0 ? "No profiles" : "No matches"}
            </h3>
            <p className="mono-tag text-muted-foreground/55">
              {count === 0
                ? "create your first connection profile to link a backend"
                : "no profiles satisfy your query"}
            </p>
            {count === 0 && (
              <Button
                className="mt-5"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Create Connection Profile
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Connection Profile"
        className="max-w-2xl"
      >
        <ConnectionProfileForm
          onSave={(data) => createMutation.mutate(data)}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editProfile != null}
        onClose={() => setEditProfile(null)}
        title={`Edit · ${editProfile?.name ?? ""}`}
        className="max-w-2xl"
      >
        {editProfile && (
          <ConnectionProfileForm
            profile={editProfile}
            onSave={(data) => updateMutation.mutate(data)}
            onCancel={() => setEditProfile(null)}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteProfile != null}
        onClose={() => setDeleteProfile(null)}
        onConfirm={() => deleteProfile != null && deleteMutation.mutate(deleteProfile.id)}
        title="Delete Connection Profile"
        message="Remove this connection profile? This action is irreversible — the profile and all its settings will be lost."
        confirmLabel="Delete"
      />
    </div>
  );
}
