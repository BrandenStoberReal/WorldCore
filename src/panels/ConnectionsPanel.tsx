import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RotateCcw, Check, Plug, AlertTriangle } from 'lucide-react';
import { ConnectionProfileSelector } from '@/components/connections/ConnectionProfileSelector';
import { TextGenPanel } from '@/components/connections/TextGenPanel';
import { ChatCompletionPanel } from '@/components/connections/ChatCompletionPanel';
import { KoboldHordeForm } from '@/components/connections/KoboldHordeForm';
import { NovelAIForm } from '@/components/connections/NovelAIForm';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHeader } from '@/components/ui/page-header';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ConnectionProfileForm } from '@/components/ConnectionProfileForm';
import { useConnection, modeForApiType, type ApiType } from '@/hooks/useConnection';
import { useGenerationStore } from '@/lib/stores';
import type { ConnectionProfile } from '@/shared/schemas/connection-profile';

const PROFILE_QUERY_KEY = ['/api/v1/connection-profiles/all'] as const;

export function ConnectionsPanel() {
  const queryClient = useQueryClient();
  const setMode = useGenerationStore((s) => s.setMode);

  const {
    profiles,
    profilesLoading,
    profilesError,
    selectedProfileId,
    setSelectedProfileId,
    selectedProfile,
    apiType,
    setApiType,
    connected,
    setConnected,
    connectionError,
    setConnectionError,
    saved,
    autoConnect,
    setAutoConnect,
    createMutation,
    updateMutation,
    deleteMutation,
    isProfileLoading,
    handleConnect,
    handleReset,
    handleCloneProfile,
    profileKey,
    bumpProfileKey,
  } = useConnection();

  // Modal state for profile CRUD (UI-only — data lives in the hook)
  const [createOpen, setCreateOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<ConnectionProfile | null>(null);
  const [deleteProfile, setDeleteProfile] = useState<ConnectionProfile | null>(null);

  // Close modals when the corresponding mutation succeeds. The hook owns the
  // data side-effects (invalidation + toast); modal dismissal is a UI concern
  // that belongs here.
  useEffect(() => {
    if (createMutation.isSuccess) setCreateOpen(false);
  }, [createMutation.isSuccess]);
  useEffect(() => {
    if (updateMutation.isSuccess) setEditProfile(null);
  }, [updateMutation.isSuccess]);
  useEffect(() => {
    if (deleteMutation.isSuccess) setDeleteProfile(null);
  }, [deleteMutation.isSuccess]);

  const handleEditProfile = useCallback(
    (id: string) => {
      const profile = profiles?.find((p) => p.id === id);
      if (profile) setEditProfile(profile);
    },
    [profiles],
  );

  const handleDeleteProfile = useCallback(
    (id: string) => {
      const profile = profiles?.find((p) => p.id === id);
      if (profile) setDeleteProfile(profile);
    },
    [profiles],
  );

  const handleReloadProfile = useCallback(
    (id: string) => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      if (id === selectedProfileId) bumpProfileKey();
    },
    [queryClient, selectedProfileId, bumpProfileKey],
  );

  if (profilesLoading) {
    return (
      <div
        data-panel="connections"
        className="flex h-64 flex-col items-center justify-center gap-3"
      >
        <LoadingSpinner size="lg" label="retrieving connection profiles" />
      </div>
    );
  }

  if (profilesError) {
    return (
      <div
        data-panel="connections"
        className="border-destructive/40 bg-card flex h-64 flex-col items-center justify-center gap-2 rounded-md border p-8"
      >
        <span className="mono-tag text-destructive">error</span>
        <p className="text-muted-foreground text-sm">{profilesError.message}</p>
      </div>
    );
  }

  return (
    <div data-panel="connections" className="flex h-full flex-col gap-3">
      {/* Header */}
      <PageHeader
        tag="[06] — LINKS"
        title="Connections"
        description="API connections for backends, models, and generation."
        action={
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-ember inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" />
                <span className="mono-tag">SAVED</span>
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="mono-tag">RESET</span>
            </Button>
            <Button size="sm" onClick={() => handleConnect({})} className="ember-pulse">
              <Plug className="h-3.5 w-3.5" />
              <span className="mono-tag font-bold">CONNECT</span>
            </Button>
          </div>
        }
      />

      {/* Connection error banner */}
      {connectionError && (
        <div className="border-destructive/40 bg-destructive/5 text-destructive flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <span className="font-medium">Connection failed</span>
            <span className="text-destructive/70 ml-1.5">{connectionError}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive h-6 px-2 text-[11px]"
            onClick={() => setConnectionError(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Profile Selector */}
      <ConnectionProfileSelector
        profiles={profiles ?? []}
        selectedId={selectedProfileId}
        onSelect={setSelectedProfileId}
        onCreate={() => setCreateOpen(true)}
        onUpdate={(id) => {
          const p = profiles?.find((prof) => prof.id === id);
          if (p) setEditProfile(p);
        }}
        onEdit={handleEditProfile}
        onClone={handleCloneProfile}
        onReload={handleReloadProfile}
        onDelete={handleDeleteProfile}
        loading={profilesLoading || isProfileLoading}
      />

      {/* API Type Selector */}
      <div className="space-y-1.5">
        <Label className="text-[13px] font-medium">API</Label>
        <Select
          value={apiType}
          onValueChange={(v) => {
            const next = v as ApiType;
            setApiType(next);
            setMode(modeForApiType(next));
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="textgenerationwebui">Text Completion</SelectItem>
            <SelectItem value="openai">Chat Completion</SelectItem>
            <SelectItem value="novel">NovelAI</SelectItem>
            <SelectItem value="koboldhorde">AI Horde</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Dynamic Form Area */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {apiType === 'textgenerationwebui' && (
          <TextGenPanel
            key={`textgen-${profileKey}`}
            onConnect={handleConnect}
            connected={connected}
            profile={selectedProfile}
            onConnected={() => setConnected(true)}
          />
        )}
        {apiType === 'openai' && (
          <ChatCompletionPanel
            key={`chat-${profileKey}`}
            onConnect={handleConnect}
            connected={connected}
            profile={selectedProfile}
          />
        )}
        {apiType === 'novel' && (
          <NovelAIForm
            key={`novel-${profileKey}`}
            onConnect={handleConnect}
            connected={connected}
            profile={selectedProfile}
          />
        )}
        {apiType === 'koboldhorde' && (
          <KoboldHordeForm
            key={`kobold-${profileKey}`}
            onConnect={handleConnect}
            connected={connected}
            profile={selectedProfile}
          />
        )}
      </div>

      {/* Bottom Bar */}
      <div className="border-border/50 flex items-center justify-between border-t pt-2">
        <label className="flex cursor-pointer items-center gap-2 text-[12px] select-none">
          <input
            type="checkbox"
            checked={autoConnect}
            onChange={(e) => setAutoConnect(e.target.checked)}
            className="border-border accent-ember rounded"
          />
          Auto-connect to Last Server
        </label>
        {selectedProfile && (
          <span className="mono-tag text-muted-foreground/50 max-w-[200px] truncate text-[10px]">
            {selectedProfile.api} / {selectedProfile.model || 'no model'}
          </span>
        )}
      </div>

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
        title={`Edit · ${editProfile?.name ?? ''}`}
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

export default ConnectionsPanel;
