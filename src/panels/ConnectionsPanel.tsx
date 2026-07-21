import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, RotateCcw, Check, Plug } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConnectionProfileSelector } from '@/components/connections/ConnectionProfileSelector';
import { TextGenPanel } from '@/components/connections/TextGenPanel';
import { ChatCompletionPanel } from '@/components/connections/ChatCompletionPanel';
import { KoboldHordeForm } from '@/components/connections/KoboldHordeForm';
import { NovelAIForm } from '@/components/connections/NovelAIForm';
import { Modal } from '@/components/Modal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ConnectionProfileForm } from '@/components/ConnectionProfileForm';
import { apiFetch, saveSettings } from '@/lib/api';
import { useNavStore } from '@/lib/navStore';
import { useGenerationStore } from '@/lib/stores';
import type { ConnectionProfile } from '@/shared/schemas/connection-profile';

type ApiType = 'textgenerationwebui' | 'openai' | 'novel' | 'koboldhorde';

function modeForApiType(api: ApiType): 'chat' | 'text' {
  return api === 'textgenerationwebui' ? 'text' : 'chat';
}

export function ConnectionsPanel() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [apiType, setApiType] = useState<ApiType>('textgenerationwebui');
  const [autoConnect, setAutoConnect] = useState(false);
  const connected = useNavStore((s) => s.connected);
  const setConnected = useNavStore((s) => s.setConnected);
  const setMode = useGenerationStore((s) => s.setMode);

  // Modal state for profile CRUD
  const [createOpen, setCreateOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<ConnectionProfile | null>(null);
  const [deleteProfile, setDeleteProfile] = useState<ConnectionProfile | null>(null);

  // Fetch profiles
  const {
    data: profiles,
    isLoading,
    error,
  } = useQuery<ConnectionProfile[]>({
    queryKey: ['/api/v1/connection-profiles/all'],
    queryFn: () =>
      apiFetch('/connection-profiles/all', {
        method: 'POST',
        body: JSON.stringify({}),
      }) as Promise<ConnectionProfile[]>,
  });

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: ConnectionProfile) => {
      return apiFetch('/connection-profiles/create', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/v1/connection-profiles/all'],
      });
      setCreateOpen(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: ConnectionProfile) => {
      return apiFetch('/connection-profiles/update', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/v1/connection-profiles/all'],
      });
      setEditProfile(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch('/connection-profiles/delete', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/v1/connection-profiles/all'],
      });
    },
  });

  const handleCloneProfile = useCallback(
    (id: string) => {
      const profile = profiles?.find((p) => p.id === id);
      if (!profile) return;

      const baseName = profile.name.replace(/\s*\(\d+\)$/, '');
      const existingNames = new Set((profiles ?? []).map((p) => p.name));
      let cloneName = `${baseName} (1)`;
      let counter = 2;
      while (existingNames.has(cloneName)) {
        cloneName = `${baseName} (${counter})`;
        counter++;
      }

      const now = new Date().toISOString();
      createMutation.mutate({
        ...profile,
        id: crypto.randomUUID(),
        name: cloneName,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      });
    },
    [profiles, createMutation],
  );

  const handleConnect = useCallback(
    async (config: Record<string, unknown>) => {
      const source = (typeof config.type === 'string' && config.type) || apiType;
      const model = (typeof config.model === 'string' && config.model) || '';
      try {
        await saveSettings({
          chat_completion_source: source,
          chat_completion_model: model,
          api: apiType,
          autoConnect,
        });
        setConnected(true);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        setConnected(false);
        setSaveError(true);
        setTimeout(() => setSaveError(false), 2000);
      }
    },
    [apiType, autoConnect],
  );

  const handleReset = useCallback(() => {
    setConnected(false);
    setSelectedProfileId(null);
    setApiType('textgenerationwebui');
    setAutoConnect(false);
  }, []);

  // Profile action handlers
  const handleViewProfile = useCallback(
    (id: string) => {
      const profile = profiles?.find((p) => p.id === id);
      if (profile) {
        setEditProfile(profile);
      }
    },
    [profiles],
  );

  const handleEditProfile = useCallback(
    (id: string) => {
      const profile = profiles?.find((p) => p.id === id);
      if (profile) {
        setEditProfile(profile);
      }
    },
    [profiles],
  );

  const handleDeleteProfile = useCallback(
    (id: string) => {
      const profile = profiles?.find((p) => p.id === id);
      if (profile) {
        setDeleteProfile(profile);
      }
    },
    [profiles],
  );

  const handleReloadProfile = useCallback(
    (id: string) => {
      // Force re-fetch the profile data
      void queryClient.invalidateQueries({
        queryKey: ['/api/v1/connection-profiles/all'],
      });
      void id;
    },
    [queryClient],
  );

  // Loading state
  if (isLoading) {
    return (
      <div
        data-panel="connections"
        className="flex h-64 flex-col items-center justify-center gap-3"
      >
        <Loader2 className="text-ember h-7 w-7 animate-spin" />
        <span className="mono-tag text-muted-foreground/55">retrieving connection profiles</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        data-panel="connections"
        className="border-destructive/40 bg-card flex h-64 flex-col items-center justify-center gap-2 rounded-sm border p-8"
      >
        <span className="mono-tag text-destructive">error</span>
        <p className="text-muted-foreground text-sm">{error.message}</p>
      </div>
    );
  }

  return (
    <div data-panel="connections" className="flex h-full flex-col gap-3">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2.5">
            <span className="mono-tag text-ember">{`[06] — LINKS`}</span>
            <span className="bg-ember/40 h-px w-8" />
          </div>
          <h2 className="display-host text-[30px] leading-none tracking-tight">Connections</h2>
          <p className="text-muted-foreground mt-1.5 max-w-md text-[13px] leading-snug">
            API connections for backends, models, and generation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-ember inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              <span className="mono-tag">SAVED</span>
            </span>
          )}
          {error && (
            <span className="text-destructive inline-flex items-center gap-2">
              <span className="mono-tag">ERROR</span>
            </span>
          )}
          <Button variant="outline" onClick={handleReset} className="h-8">
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="mono-tag">RESET</span>
          </Button>
          <Button onClick={() => handleConnect({})} className="ember-pulse h-8">
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
        onClone={handleCloneProfile}
        onReload={handleReloadProfile}
        onDelete={handleDeleteProfile}
        loading={isLoading}
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
          <TextGenPanel onConnect={handleConnect} connected={connected} />
        )}
        {apiType === 'openai' && (
          <ChatCompletionPanel onConnect={handleConnect} connected={connected} />
        )}
        {apiType === 'novel' && <NovelAIForm onConnect={handleConnect} connected={connected} />}
        {apiType === 'koboldhorde' && (
          <KoboldHordeForm onConnect={handleConnect} connected={connected} />
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
