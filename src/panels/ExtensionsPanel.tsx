import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/Modal';
import {
  Download,
  RefreshCw,
  Plus,
  Package,
  User,
  Calendar,
  GitBranch,
  Globe,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { cn, surfaceCard } from '@/lib/utils';
import { apiGet, apiPost } from '@/lib/api';
import { emit } from '@/lib/extensionEventBus';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { ExtensionRow } from '@/shared/types/extensions';

export function ExtensionsPanel() {
  const queryClient = useQueryClient();
  const [installOpen, setInstallOpen] = useState(false);
  const [installUrl, setInstallUrl] = useState('');
  const [installScope, setInstallScope] = useState<'user' | 'global'>('user');

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
    mutationFn: async (params: { url: string; scope: 'user' | 'global' }) => {
      return await apiPost<unknown>('/extensions/install', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/extensions/list'] });
      setInstallOpen(false);
      setInstallUrl('');
      setInstallScope('user');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiPost<unknown>('/extensions/update', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/extensions/list'] });
    },
  });

  const updateAllMutation = useMutation({
    mutationFn: async () => {
      return await apiPost<unknown>('/extensions/updateAll');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/extensions/list'] });
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
              disabled={updateAllMutation.isPending || !extensions?.length}
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

      <div className="border-border bg-background/40 flex h-8 items-center gap-1.5 self-start rounded-md border px-2.5">
        <span className="mono-tag text-muted-foreground/55">modules</span>
        <span className="mono-tag text-ember tabular-nums">
          {String(extensions?.length ?? 0).padStart(2, '0')}
        </span>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {extensions?.map((ext, idx) => (
          <Card
            key={ext.id}
            className={cn(
              surfaceCard,
              'group relative overflow-hidden rounded-md py-0 transition-all',
              'hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-12px_color-mix(in_oklch,var(--ember)_45%,transparent)]',
              ext.enabled ? '' : 'opacity-55',
            )}
          >
            <div className="bg-background/30 border-border/60 flex items-center justify-between border-b px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="mono-tag text-muted-foreground/45 tabular-nums">
                  {`#${String(idx + 1).padStart(2, '0')}`}
                </span>
                <Package className="text-ember/70 h-3 w-3 shrink-0" />
                <span className="mono-tag text-ember/80 truncate">{ext.displayName || ext.id}</span>
                {ext.scope === 'global' && (
                  <Globe
                    className="text-muted-foreground/60 h-3 w-3 shrink-0"
                    aria-label="global"
                  />
                )}
              </div>
              <ForgeToggle
                enabled={ext.enabled}
                onToggle={() => toggleMutation.mutate({ id: ext.id, enable: !ext.enabled })}
              />
            </div>

            <CardContent className="space-y-2 p-3">
              <p className="text-foreground/75 line-clamp-2 text-[12px] leading-relaxed">
                {ext.description || (
                  <span className="text-muted-foreground/40 italic">no description supplied</span>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                <span className="mono-tag text-muted-foreground/65 inline-flex items-center gap-1">
                  <GitBranch className="h-2.5 w-2.5" />v{ext.version}
                </span>
                <span className="mono-tag text-muted-foreground/65 inline-flex items-center gap-1">
                  <User className="h-2.5 w-2.5" />
                  {ext.author || 'anon'}
                </span>
                {ext.lastUpdatedAt && (
                  <span className="mono-tag text-muted-foreground/65 inline-flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5" />
                    {new Date(ext.lastUpdatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="border-border/40 -mx-3 -mb-1 flex justify-end gap-1.5 border-t px-3 pt-1 pb-1">
                {ext.scope !== 'global' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => uninstallMutation.mutate(ext.id)}
                    disabled={uninstallMutation.isPending}
                    className="h-6"
                    aria-label="uninstall extension"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                    <span className="mono-tag">REMOVE</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateMutation.mutate(ext.id)}
                  disabled={updateMutation.isPending || !ext.gitUrl}
                  className="h-6"
                >
                  <RefreshCw
                    className={cn(
                      'h-2.5 w-2.5',
                      updateMutation.isPending &&
                        updateMutation.variables === ext.id &&
                        'animate-spin',
                    )}
                  />
                  <span className="mono-tag">UPDATE MODULE</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {extensions?.length === 0 && (
        <Card className={cn(surfaceCard, 'relative overflow-hidden rounded-md px-6 py-12')}>
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="border-border bg-muted/40 mb-3 flex h-12 w-12 items-center justify-center rounded-md border">
              <Package className="text-ember/60 h-5 w-5" />
            </div>
            <h3 className="display-host mb-1 text-lg">No modules</h3>
            <p className="mono-tag text-muted-foreground/55 mb-4">
              install a module from URL to extend WorldCore
            </p>
            <Button size="sm" onClick={() => setInstallOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Install Module
            </Button>
          </CardContent>
        </Card>
      )}

      <Modal
        open={installOpen}
        onClose={() => setInstallOpen(false)}
        title="Install Module"
        className="max-w-xl"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="mono-tag text-muted-foreground/70">MODULE URL</label>
            <Input
              value={installUrl}
              onChange={(e) => setInstallUrl(e.target.value)}
              placeholder="https://github.com/...  or local path"
              className="font-mono text-[13px]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="mono-tag text-muted-foreground/70">SCOPE</label>
            <div className="flex gap-2">
              <ScopeChoice
                label="user"
                hint="per-user (private)"
                selected={installScope === 'user'}
                onClick={() => setInstallScope('user')}
              />
              <ScopeChoice
                label="global"
                hint="shared across users (admin-only)"
                selected={installScope === 'global'}
                onClick={() => setInstallScope('global')}
              />
            </div>
          </div>
          <p className="mono-tag text-muted-foreground/55">
            git repository or direct download link accepted
          </p>

          <div className="border-border/60 flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setInstallOpen(false)}>
              <span className="mono-tag">cancel</span>
            </Button>
            <Button
              onClick={() => installMutation.mutate({ url: installUrl, scope: installScope })}
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

function ForgeToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
        enabled ? 'bg-ember' : 'bg-muted',
      )}
    >
      <span className="sr-only">Toggle module</span>
      <span
        className={cn(
          'bg-background pointer-events-none inline-block h-3 w-3 transform rounded-full shadow ring-0 transition-transform',
          enabled ? 'translate-x-3.5' : 'translate-x-0',
        )}
      />
    </button>
  );
}
