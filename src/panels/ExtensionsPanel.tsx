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
  Search,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { InlineSection } from '@/components/drawers/InlineSection';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { StatusToggle } from '@/components/ui/status-toggle';
import { cn, surfaceCard, subtleEdge } from '@/lib/utils';
import { apiGet, apiPost } from '@/lib/api';
import { emit } from '@/lib/extensionEventBus';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { ExtensionRow } from '@/shared/types/extensions';

export function ExtensionsPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
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

  const filtered = extensions?.filter(
    (e) =>
      e.displayName.toLowerCase().includes(search.toLowerCase()) ||
      e.id.toLowerCase().includes(search.toLowerCase()) ||
      e.author.toLowerCase().includes(search.toLowerCase()),
  );

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

      <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered?.map((ext, idx) => (
          <Card
            key={ext.id}
            className={cn(
              surfaceCard,
              subtleEdge,
              'group relative overflow-hidden rounded-md py-0 transition-all',
              'hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_color-mix(in_oklch,var(--ember)_45%,transparent)]',
              ext.enabled ? '' : 'opacity-55',
            )}
          >
            {/* Top rail */}
            <div className="bg-background/30 border-border/60 flex items-center justify-between border-b px-3 py-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="mono-tag text-muted-foreground/55 tabular-nums">
                  {`#${String(idx + 1).padStart(3, '0')}`}
                </span>
                <Package className="text-ember/70 h-3 w-3 shrink-0" />
                <span className="mono-tag text-ember/70 truncate">{ext.displayName || ext.id}</span>
                {ext.scope === 'global' && (
                  <Globe
                    className="text-muted-foreground/60 h-3 w-3 shrink-0"
                    aria-label="global"
                  />
                )}
                <StatusToggle
                  enabled={ext.enabled}
                  onToggle={() => toggleMutation.mutate({ id: ext.id, enable: !ext.enabled })}
                />
              </div>
            </div>

            <CardContent className="space-y-2 px-3 py-2">
              <p className="text-foreground/80 line-clamp-2 text-[12px] leading-relaxed">
                {ext.description || (
                  <span className="text-muted-foreground/40 italic">no description supplied</span>
                )}
              </p>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge label="VERSION" value={`v${ext.version}`} icon={GitBranch} />
                <Badge label="AUTHOR" value={ext.author || 'anon'} icon={User} />
                {ext.lastUpdatedAt && (
                  <Badge
                    label="UPDATED"
                    value={new Date(ext.lastUpdatedAt).toLocaleDateString()}
                    icon={Calendar}
                  />
                )}
                <Badge label="SCOPE" value={ext.scope} icon={Globe} />
              </div>
            </CardContent>

            {/* Action rail — always visible */}
            <div className="border-border/60 divide-border/60 flex items-stretch divide-x border-t">
              {ext.gitUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateMutation.mutate(ext.id)}
                  disabled={updateMutation.isPending}
                  className="hover:bg-accent/40 hover:text-ember h-8 flex-1 justify-center rounded-none border-0 font-medium"
                >
                  <RefreshCw
                    className={cn(
                      'h-3 w-3',
                      updateMutation.isPending &&
                        updateMutation.variables === ext.id &&
                        'animate-spin',
                    )}
                  />
                  <span className="mono-tag">Update</span>
                </Button>
              )}
              {ext.scope !== 'global' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-destructive/10 hover:text-destructive h-8 flex-1 justify-center rounded-none border-0 font-medium"
                  onClick={() => uninstallMutation.mutate(ext.id)}
                  disabled={uninstallMutation.isPending}
                  aria-label="uninstall extension"
                >
                  <Trash2 className="h-3 w-3" />
                  <span className="mono-tag">Uninstall</span>
                </Button>
              )}
            </div>
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
