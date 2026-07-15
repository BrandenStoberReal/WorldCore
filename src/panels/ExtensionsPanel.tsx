import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/Modal';
import {
  Loader2,
  Download,
  RefreshCw,
  Plus,
  Package,
  User,
  Calendar,
  GitBranch,
} from 'lucide-react';
import { cn, surfaceCard } from '@/lib/utils';
import type { ExtensionInfo } from '@/shared/types/extensions';

export function ExtensionsPanel() {
  const queryClient = useQueryClient();
  const [installOpen, setInstallOpen] = useState(false);
  const [installUrl, setInstallUrl] = useState('');

  const {
    data: extensions,
    isLoading,
    error,
  } = useQuery<ExtensionInfo[]>({
    queryKey: ['/api/v1/extensions/list'],
    queryFn: async () => {
      const res = await fetch('/api/v1/extensions/list');
      if (!res.ok) throw new Error('Failed to fetch extensions');
      const data = await res.json();
      return Array.isArray(data) ? data : (data.results ?? data.data ?? data);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ name, enable }: { name: string; enable: boolean }) => {
      const endpoint = enable ? 'enable' : 'disable';
      const res = await fetch(`/api/v1/extensions/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(`Failed to ${enable ? 'enable' : 'disable'} extension`);
      const result = await res.json();
      return Array.isArray(result) ? result : (result.results ?? result.data ?? result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/extensions/list'] });
    },
  });

  const installMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch('/api/v1/extensions/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error('Failed to install extension');
      const result = await res.json();
      return Array.isArray(result) ? result : (result.results ?? result.data ?? result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/extensions/list'] });
      setInstallOpen(false);
      setInstallUrl('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/v1/extensions/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error('Failed to update extension');
      const result = await res.json();
      return Array.isArray(result) ? result : (result.results ?? result.data ?? result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/extensions/list'] });
    },
  });

  const updateAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v1/extensions/updateAll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to update all extensions');
      const result = await res.json();
      return Array.isArray(result) ? result : (result.results ?? result.data ?? result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/extensions/list'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="text-ember h-7 w-7 animate-spin" />
        <span className="mono-tag text-muted-foreground/55">indexing modules</span>
      </div>
    );
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
      {/* Section header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <span className="mono-tag text-ember">{`[05] — MODULES`}</span>
            <span className="bg-ember/40 h-px w-10" />
          </div>
          <h2 className="display-host text-[42px] leading-none tracking-tight">Extensions</h2>
          <p className="text-muted-foreground mt-2 max-w-md text-sm">
            Extend WorldCore with additional functionality. Install, update, and toggle extensions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => updateAllMutation.mutate()}
            disabled={updateAllMutation.isPending || !extensions?.length}
            className="h-9"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5', updateAllMutation.isPending && 'animate-spin')}
            />
            <span className="mono-tag">UPDATE ALL</span>
          </Button>
          <Button onClick={() => setInstallOpen(true)} className="ember-pulse h-9">
            <Download className="h-3.5 w-3.5" />
            <span className="mono-tag font-bold">INSTALL</span>
          </Button>
        </div>
      </header>

      <div className="border-border bg-background/40 flex h-9 items-center gap-1.5 self-start rounded-sm border px-3">
        <span className="mono-tag text-muted-foreground/55">modules</span>
        <span className="mono-tag text-ember tabular-nums">
          {String(extensions?.length ?? 0).padStart(2, '0')}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {extensions?.map((ext, idx) => (
          <Card
            key={ext.name}
            className={cn(
              surfaceCard,
              'group relative overflow-hidden rounded-sm py-0 transition-all',
              'hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-12px_color-mix(in_oklch,var(--ember)_45%,transparent)]',
              ext.enabled ? '' : 'opacity-55',
            )}
          >
            {/* Top rail */}
            <div className="bg-background/30 border-border/60 flex items-center justify-between border-b px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="mono-tag text-muted-foreground/45 tabular-nums">
                  {`#${String(idx + 1).padStart(2, '0')}`}
                </span>
                <Package className="text-ember/70 h-3.5 w-3.5 shrink-0" />
                <span className="mono-tag text-ember/80 truncate">{ext.displayName}</span>
              </div>
              <ForgeToggle
                enabled={ext.enabled}
                onToggle={() => toggleMutation.mutate({ name: ext.name, enable: !ext.enabled })}
              />
            </div>

            <CardContent className="space-y-3 p-4">
              <p className="text-foreground/75 line-clamp-2 text-[13px] leading-relaxed">
                {ext.description || (
                  <span className="text-muted-foreground/40 italic">no description supplied</span>
                )}
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="mono-tag text-muted-foreground/65 inline-flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />v{ext.version}
                </span>
                <span className="mono-tag text-muted-foreground/65 inline-flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {ext.author || 'anon'}
                </span>
                {ext.lastUpdated && (
                  <span className="mono-tag text-muted-foreground/65 inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(ext.lastUpdated).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="border-border/40 -mx-4 -mb-1 flex justify-end border-t px-4 pt-1 pb-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateMutation.mutate(ext.name)}
                  disabled={updateMutation.isPending}
                  className="h-7"
                >
                  <RefreshCw
                    className={cn(
                      'h-3 w-3',
                      updateMutation.isPending &&
                        updateMutation.variables === ext.name &&
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
        <Card className={cn(surfaceCard, 'relative overflow-hidden rounded-sm px-6 py-16')}>
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="border-border bg-muted/40 mb-4 flex h-14 w-14 items-center justify-center rounded-sm border">
              <Package className="text-ember/60 h-6 w-6" />
            </div>
            <h3 className="display-host mb-1 text-xl">No modules</h3>
            <p className="mono-tag text-muted-foreground/55 mb-5">
              install a module from URL to extend WorldCore
            </p>
            <Button onClick={() => setInstallOpen(true)}>
              <Plus className="h-4 w-4" />
              Install Module
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Install Modal */}
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
              placeholder="https://github.com/..."
              className="font-mono text-[13px]"
            />
          </div>
          <p className="mono-tag text-muted-foreground/55">
            git repository or direct download link accepted
          </p>

          <div className="border-border/60 flex justify-end gap-2 border-t pt-3">
            <Button variant="outline" onClick={() => setInstallOpen(false)}>
              <span className="mono-tag">cancel</span>
            </Button>
            <Button
              onClick={() => installMutation.mutate(installUrl)}
              disabled={!installUrl.trim() || installMutation.isPending}
              className="ember-pulse"
            >
              {installMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
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

function ForgeToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
        enabled ? 'bg-ember' : 'bg-muted',
      )}
    >
      <span className="sr-only">Toggle module</span>
      <span
        className={cn(
          'bg-background pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition-transform',
          enabled ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}
