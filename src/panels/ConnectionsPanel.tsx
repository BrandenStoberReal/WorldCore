import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RotateCcw, Check, Plug } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConnectionProfileSelector } from "@/components/connections/ConnectionProfileSelector";
import { TextGenPanel } from "@/components/connections/TextGenPanel";
import { ChatCompletionPanel } from "@/components/connections/ChatCompletionPanel";
import { KoboldHordeForm } from "@/components/connections/KoboldHordeForm";
import { NovelAIForm } from "@/components/connections/NovelAIForm";
import { OnlineStatus } from "@/components/connections/OnlineStatus";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ConnectionProfileForm } from "@/components/ConnectionProfileForm";
import { apiFetch } from "@/lib/api";
import type { ConnectionProfile } from "@/shared/schemas/connection-profile";

type ApiType =
  | "textgenerationwebui"
  | "openai"
  | "novel"
  | "koboldhorde"
  | "kobold";

export function ConnectionsPanel() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    null,
  );
  const [apiType, setApiType] = useState<ApiType>("textgenerationwebui");
  const [autoConnect, setAutoConnect] = useState(false);
  const [connected, setConnected] = useState(false);

  // Modal state for profile CRUD
  const [createOpen, setCreateOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<ConnectionProfile | null>(
    null,
  );
  const [deleteProfile, setDeleteProfile] = useState<ConnectionProfile | null>(
    null,
  );

  // Fetch profiles
  const {
    data: profiles,
    isLoading,
    error,
  } = useQuery<ConnectionProfile[]>({
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
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/connection-profiles/all"],
      });
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
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/connection-profiles/all"],
      });
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
      queryClient.invalidateQueries({
        queryKey: ["/api/v1/connection-profiles/all"],
      });
    },
  });

  const handleConnect = useCallback(
    (_config: Record<string, unknown>) => {
      // TODO: Send config to backend for actual connection
      setConnected(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    [],
  );

  const handleReset = useCallback(() => {
    setConnected(false);
    setSelectedProfileId(null);
    setApiType("textgenerationwebui");
    setAutoConnect(false);
  }, []);

  // Profile action handlers
  const handleViewProfile = useCallback((id: string) => {
    const profile = profiles?.find((p) => p.id === id);
    if (profile) {
      setEditProfile(profile);
    }
  }, [profiles]);

  const handleEditProfile = useCallback((id: string) => {
    const profile = profiles?.find((p) => p.id === id);
    if (profile) {
      setEditProfile(profile);
    }
  }, [profiles]);

  const handleDeleteProfile = useCallback((id: string) => {
    const profile = profiles?.find((p) => p.id === id);
    if (profile) {
      setDeleteProfile(profile);
    }
  }, [profiles]);

  const handleReloadProfile = useCallback((id: string) => {
    // Force re-fetch the profile data
    void queryClient.invalidateQueries({
      queryKey: ["/api/v1/connection-profiles/all"],
    });
    void id;
  }, [queryClient]);

  // Loading state
  if (isLoading) {
    return (
      <div
        data-panel="connections"
        className="flex items-center justify-center h-64 flex-col gap-3"
      >
        <Loader2 className="h-7 w-7 animate-spin text-ember" />
        <span className="mono-tag text-muted-foreground/55">
          retrieving connection profiles
        </span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        data-panel="connections"
        className="flex items-center justify-center h-64 flex-col gap-2 p-8 border border-destructive/40 rounded-sm bg-card"
      >
        <span className="mono-tag text-destructive">error</span>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);

  return (
    <div data-panel="connections" className="flex flex-col gap-4 h-full">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="mono-tag text-ember">{`[06] — LINKS`}</span>
            <span className="h-px w-10 bg-ember/40" />
          </div>
          <h2 className="display-host text-[42px] leading-none tracking-tight">
            Connections
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            API connections for backends, models, and generation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="inline-flex items-center gap-2 text-ember">
              <Check className="h-4 w-4" />
              <span className="mono-tag">SAVED</span>
            </span>
          )}
          <Button
            variant="outline"
            onClick={handleReset}
            className="h-9"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="mono-tag">RESET</span>
          </Button>
          <Button onClick={() => handleConnect({})} className="h-9 ember-pulse">
            <Plug className="h-3.5 w-3.5" />
            <span className="mono-tag font-bold">CONNECT</span>
          </Button>
        </div>
      </header>

      {/* Profile Selector */}
      <ConnectionProfileSelector
        profiles={profiles ?? []}
        selectedId={selectedProfileId}
        onSelect={setSelectedProfileId}
        onView={handleViewProfile}
        onCreate={() => setCreateOpen(true)}
        onUpdate={(id) => {
          const p = profiles?.find((prof) => prof.id === id);
          if (p) setEditProfile(p);
        }}
        onEdit={handleEditProfile}
        onReload={handleReloadProfile}
        onDelete={handleDeleteProfile}
        loading={isLoading}
      />

      {/* API Type Selector */}
      <div className="space-y-1.5">
        <Label className="text-[13px] font-medium">API</Label>
        <Select
          value={apiType}
          onValueChange={(v) => setApiType(v as ApiType)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="textgenerationwebui">
              Text Completion
            </SelectItem>
            <SelectItem value="openai">Chat Completion</SelectItem>
            <SelectItem value="novel">NovelAI</SelectItem>
            <SelectItem value="koboldhorde">AI Horde</SelectItem>
            <SelectItem value="kobold">KoboldAI Classic</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dynamic Form Area */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {apiType === "textgenerationwebui" && (
          <TextGenPanel onConnect={handleConnect} connected={connected} />
        )}
        {apiType === "openai" && (
          <ChatCompletionPanel onConnect={handleConnect} connected={connected} />
        )}
        {apiType === "novel" && (
          <NovelAIForm onConnect={handleConnect} connected={connected} />
        )}
        {apiType === "koboldhorde" && (
          <KoboldHordeForm onConnect={handleConnect} connected={connected} />
        )}
        {apiType === "kobold" && (
          <div className="space-y-4 p-4 rounded-sm border border-border/60 bg-muted/20">
            <p className="text-sm text-muted-foreground">
              KoboldAI Classic connection
            </p>
            {/* TODO: Add KoboldAI Classic form */}
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <label className="flex items-center gap-2 text-[13px] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoConnect}
            onChange={(e) => setAutoConnect(e.target.checked)}
            className="rounded border-border accent-ember"
          />
          Auto-connect to Last Server
        </label>
        {selectedProfile && (
          <span className="mono-tag text-[11px] text-muted-foreground/50 truncate max-w-[200px]">
            {selectedProfile.api} / {selectedProfile.model || "no model"}
          </span>
        )}
      </div>

      {/* Connection Status */}
      <OnlineStatus
        connected={connected}
        text={connected ? "Connected" : "No connection..."}
      />

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
        onConfirm={() =>
          deleteProfile != null && deleteMutation.mutate(deleteProfile.id)
        }
        title="Delete Connection Profile"
        message="Remove this connection profile? This action is irreversible — the profile and all its settings will be lost."
        confirmLabel="Delete"
      />
    </div>
  );
}
