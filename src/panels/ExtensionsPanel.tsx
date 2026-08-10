import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/Modal';
import {
  Download,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  Settings,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageHeader } from '@/components/ui/page-header';
import { InlineSection } from '@/components/drawers/InlineSection';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusToggle } from '@/components/ui/status-toggle';
import { cn, surfaceCard, subtleEdge } from '@/lib/utils';
import { apiGet, apiPost } from '@/lib/api';
import { emit } from '@/lib/extensionEventBus';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { getExtensionSettingsPanel } from '@/lib/worldcoreApi';
import type { ExtensionRow } from '@/shared/types/extensions';

export function ExtensionsPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [installOpen, setInstallOpen] = useState(false);
  const [installUrl, setInstallUrl] = useState('');
  const [installScope, setInstallScope] = useState<'user' | 'global'>('user');
  const [installSubfolder, setInstallSubfolder] = useState('');
  const [uninstallId, setUninstallId] = useState<string | null>(null);
  const [settingsExtId, setSettingsExtId] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<Record<string, string>>({});

  const {
    data: extensions,
    isLoading,
    error,
  } = useQuery<ExtensionRow[]>({
    queryKey: ['/api/v1/extensions/list'],
    queryFn: async () => {
      return await apiGet<ExtensionRow[]>('/extensions/list');
    },
    meta: { silenceErrorToast: true },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enable }: { id: string; enable: boolean }) => {
      const endpoint = enable ? 'enable' : 'disable';
      return await apiPost<unknown>(`/extensions/${endpoint}`, { id });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/extensions/list'] });
      emit(variables.enable ? 'ext_enabled' : 'ext_disabled', { id: variables.id });
    },
  });

  const installMutation = useMutation({
    mutationFn: async (params: { url: string; scope: 'user' | 'global'; subfolder?: string }) => {
      return await apiPost<unknown>('/extensions/install', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/extensions/list'] });
      setInstallOpen(false);
      setInstallUrl('');
      setInstallScope('user');
      setInstallSubfolder('');
      window.location.reload();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiPost<unknown>('/extensions/update', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/extensions/list'] });
      window.location.reload();
    },
  });

  const updateAllMutation = useMutation({
    mutationFn: async () => {
      return await apiPost<unknown>('/extensions/updateAll');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/extensions/list'] });
      window.location.reload();
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiPost<unknown>('/extensions/uninstall', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/extensions/list'] });
    },
  });

  const { data: extSettings } = useQuery<Record<string, string>>({
    queryKey: ['/api/v1/extensions/settings', settingsExtId],
    queryFn: async () => {
      const res = await apiGet<{ ok: boolean; settings: Record<string, string> }>(
        `/extensions/settings?id=${settingsExtId}`,
      );
      return res.settings ?? {};
    },
    enabled: settingsExtId != null,
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async ({ id, key, value }: { id: string; key: string; value: string }) => {
      return await apiPost<unknown>('/extensions/settings', { id, key, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/extensions/settings'] });
    },
  });

  const filtered = extensions?.filter(
    (e) =>
      e.displayName.toLowerCase().includes(search.toLowerCase()) ||
      e.id.toLowerCase().includes(search.toLowerCase()) ||
      e.author.toLowerCase().includes(search.toLowerCase()),
  );

  function openSettings(extId: string) {
    setSettingsExtId(extId);
    setSettingsDraft({});
  }

  function closeSettings() {
    setSettingsExtId(null);
    setSettingsDraft({});
  }

  if (isLoading) {
    return <LoadingSpinner size="lg" label="indexing modules" className="h-64" />;
  }

  if (error) {
    return (
      <div className={cn(surfaceCard, 'flex h-64 items-center justify-center')}>
        <span className="mono-tag text-destructive">{error.message}</span>
      </div>
    );
  }

  return (
    <div className="section-rhythm relative isolate" data-panel="extensions">
      <PageHeader
        tag="[05] — MODULES"
        title="Extensions"
        description="Extend WorldCore with additional functionality. Install, update, and toggle extensions."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => updateAllMutation.mutate()}
              disabled={updateAllMutation.isPending || !extensions?.some((e) => e.gitUrl)}
              className="h-8"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', updateAllMutation.isPending && 'animate-spin')}
              />
              <span className="mono-tag">UPDATE ALL</span>
            </Button>
            <Button onClick={() => setInstallOpen(true)} className="ember-pulse h-8">
              <Download className="h-3.5 w-3.5" />
              <span className="mono-tag font-bold">INSTALL</span>
            </Button>
          </div>
        }
      />

      <InlineSection panelId="extensions" sectionId="search" title="Search & Filter">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="text-muted-foreground/55 absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              placeholder="query · name, author, or id fragment..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 font-mono text-[12px] tracking-tight"
            />
          </div>
          <div className="border-border bg-background/40 flex h-8 items-center gap-1.5 rounded-md border px-2.5">
            <span className="mono-tag text-muted-foreground/55">modules</span>
            <span className="mono-tag text-ember tabular-nums">
              {String(filtered?.length ?? 0).padStart(2, '0')}
            </span>
            <span className="mono-tag text-muted-foreground/40">/</span>
            <span className="mono-tag text-foreground/70 tabular-nums">
              {String(extensions?.length ?? 0).padStart(2, '0')}
            </span>
          </div>
        </div>
      </InlineSection>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered?.map((ext) => (
          <Card
            key={ext.id}
            className={cn(
              surfaceCard,
              subtleEdge,
              'group relative flex flex-col overflow-hidden rounded-md py-0 transition-all',
              'hover:-translate-y-0.5 hover:shadow-[0_6px_20px_-8px_color-mix(in_oklch,var(--ember)_35%,transparent)]',
              ext.enabled ? '' : 'opacity-50',
            )}
          >
            <CardHeader className="px-3.5 pt-3 pb-0">
              <div className="flex items-start justify-between gap-2">
                <CardTitle
                  className={cn(
                    'display-host min-w-0 truncate text-[14px] leading-tight',
                    ext.hasUpdate ? 'text-emerald-400' : 'text-foreground/90',
                  )}
                >
                  {ext.displayName || ext.id}
                </CardTitle>
                <StatusToggle
                  enabled={ext.enabled}
                  onToggle={() => toggleMutation.mutate({ id: ext.id, enable: !ext.enabled })}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="mono-tag text-muted-foreground/45">v{ext.version}</span>
                <span className="text-muted-foreground/25">·</span>
                <span className="mono-tag text-muted-foreground/45 truncate">
                  {ext.author || 'anon'}
                </span>
                {ext.scope === 'global' && (
                  <>
                    <span className="text-muted-foreground/25">·</span>
                    <span className="mono-tag text-ember/60">global</span>
                  </>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col px-3.5 pt-1.5 pb-2.5">
              <p className="text-muted-foreground/60 line-clamp-2 text-[11.5px] leading-snug">
                {ext.description || (
                  <span className="text-muted-foreground/30 italic">no description</span>
                )}
              </p>

              <div className="border-border/40 mt-auto flex items-center justify-between gap-1 border-t pt-2">
                <span className="mono-tag text-muted-foreground/35 truncate">
                  {ext.lastUpdatedAt
                    ? new Date(ext.lastUpdatedAt).toLocaleDateString()
                    : ''}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  {ext.gitUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateMutation.mutate(ext.id)}
                      disabled={updateMutation.isPending}
                      className="text-muted-foreground/50 hover:text-ember touch-target h-6 px-1.5 text-[11px]"
                    >
                      <RefreshCw
                        className={cn(
                          'h-2.5 w-2.5',
                          updateMutation.isPending &&
                            updateMutation.variables === ext.id &&
                            'animate-spin',
                        )}
                      />
                      <span className="mono-tag">update</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openSettings(ext.id)}
                    className="text-muted-foreground/50 hover:text-ember touch-target h-6 px-1.5 text-[11px]"
                  >
                    <Settings className="h-2.5 w-2.5" />
                    <span className="mono-tag">config</span>
                  </Button>
                  {ext.scope !== 'global' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground/50 hover:text-destructive touch-target h-6 px-1.5 text-[11px]"
                      onClick={() => setUninstallId(ext.id)}
                      disabled={uninstallMutation.isPending}
                      aria-label="uninstall extension"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                      <span className="mono-tag">remove</span>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered?.length === 0 && (
        <EmptyState
          icon={<span className="display-host text-ember text-xl">∅</span>}
          title="forge cold"
          description="no modules forged — install a module from URL to extend WorldCore"
          action={
            <Button size="sm" onClick={() => setInstallOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Install Module
            </Button>
          }
        />
      )}

      <Modal
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        title="Install Module"
        className="max-w-md max-h-[85vh]"
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="mono-tag text-muted-foreground/70">MODULE URL</label>
            <Input
              value={installUrl}
              onChange={(e) => setInstallUrl(e.target.value)}
              placeholder="https://github.com/...  or local path"
              className="font-mono text-[13px]"
            />
          </div>
          <div className="space-y-1">
            <label className="mono-tag text-muted-foreground/70">SCOPE</label>
            <div className="flex gap-2">
              <ScopeChoice
                label="user"
                hint="private forge (per-user)"
                selected={installScope === 'user'}
                onClick={() => setInstallScope('user')}
              />
              <ScopeChoice
                label="global"
                hint="shared smithy (admin-only)"
                selected={installScope === 'global'}
                onClick={() => setInstallScope('global')}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="mono-tag text-muted-foreground/70">SUBFOLDER (optional)</label>
            <Input
              value={installSubfolder}
              onChange={(e) => setInstallSubfolder(e.target.value)}
              placeholder="extensions/my-ext — for monorepo repos"
              className="font-mono text-[13px]"
            />
          </div>
          <p className="mono-tag text-muted-foreground/55">
            git repository or direct download link accepted
          </p>

          <div className="border-border/60 flex justify-end gap-2 border-t pt-2.5">
            <Button variant="outline" onClick={() => setInstallOpen(false)}>
              <span className="mono-tag">cancel</span>
            </Button>
            <Button
              onClick={() =>
                installMutation.mutate({
                  url: installUrl,
                  scope: installScope,
                  subfolder: installSubfolder || undefined,
                })
              }
              disabled={!installUrl.trim() || installMutation.isPending}
              className="ember-pulse"
            >
              {installMutation.isPending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span className="mono-tag font-bold">
                {installMutation.isPending ? 'FORGING...' : 'INSTALL'}
              </span>
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={settingsExtId != null}
        onClose={closeSettings}
        title="Extension Settings"
        className="max-w-md max-h-[85vh]"
      >
        {settingsExtId && (() => {
          const RegisteredPanel = getExtensionSettingsPanel(settingsExtId);
          if (RegisteredPanel) {
            return <RegisteredPanel />;
          }
          return (
            <div className="space-y-3">
              <p className="mono-tag text-muted-foreground/60">
                {settingsExtId}
              </p>
              {extSettings && Object.keys(extSettings).length === 0 && (
                <p className="text-muted-foreground/50 text-sm italic">No settings configured</p>
              )}
              {extSettings && Object.entries(extSettings).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <label className="mono-tag text-muted-foreground/70">{key}</label>
                  <Input
                    value={settingsDraft[key] ?? String(value ?? '')}
                    onChange={(e) => setSettingsDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                    className="font-mono text-[13px]"
                  />
                </div>
              ))}
              <div className="border-border/60 flex justify-end gap-2 border-t pt-2.5">
                <Button variant="outline" onClick={closeSettings}>
                  <span className="mono-tag">cancel</span>
                </Button>
                <Button
                  onClick={async () => {
                    for (const [key, value] of Object.entries(settingsDraft)) {
                      await saveSettingsMutation.mutateAsync({ id: settingsExtId, key, value });
                    }
                    closeSettings();
                  }}
                  disabled={saveSettingsMutation.isPending || Object.keys(settingsDraft).length === 0}
                  className="ember-pulse"
                >
                  <span className="mono-tag font-bold">
                    {saveSettingsMutation.isPending ? 'SAVING...' : 'SAVE'}
                  </span>
                </Button>
              </div>
            </div>
          );
        })()}
      </Modal>

      <ConfirmDialog
        open={uninstallId != null}
        onClose={() => setUninstallId(null)}
        onConfirm={() => {
          if (uninstallId) {
            uninstallMutation.mutate(uninstallId);
            setUninstallId(null);
          }
        }}
        title="Uninstall Extension"
        message="Remove this extension? This action cannot be undone."
        confirmLabel="Uninstall"
      />
    </div>
  );
}

function ScopeChoice({
  label,
  hint,
  selected,
  onClick,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 cursor-pointer rounded-md border px-3 py-2 text-left transition-colors',
        selected
          ? 'border-ember bg-ember/10'
          : 'border-border bg-background/40 hover:border-border/80',
      )}
    >
      <div className="mono-tag text-foreground mb-0.5">{label}</div>
      <div className="text-muted-foreground/60 text-[11px] leading-tight">{hint}</div>
    </button>
  );
}

export default ExtensionsPanel;
