import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Loader2, Search, FileX } from 'lucide-react';
import { cn, surfaceCard } from '@/lib/utils';
import { apiPost } from '@/lib/api';

/* ── Types (local — mirrors backend contract) ── */

interface OrphanCharacterFile {
  fileName: string;
  absolutePath: string;
  sizeBytes: number;
  hasEmbeddedCard: boolean;
  embeddedName?: string;
  reason: 'no_db_row' | 'plain_png';
}

interface ReconcileListResponse {
  orphans: OrphanCharacterFile[];
}

interface ReconcileDeleteResponse {
  deleted: string[];
  skipped: Array<{ path: string; reason: string }>;
}

/* ── Helpers ── */

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  if (i === 0) return `${value} B`;
  return value >= 10 ? `${value.toFixed(1)} ${units[i]}` : `${value.toFixed(2)} ${units[i]}`;
}

function reasonLabel(orphan: OrphanCharacterFile): string {
  if (orphan.reason === 'no_db_row' && orphan.embeddedName) {
    return `card: ${orphan.embeddedName}`;
  }
  return 'no embedded card';
}

/* ── Panel ── */

export function SettingsPanel() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{
    deleted: number;
    skipped: number;
  } | null>(null);

  /* ── Scan query (manual trigger only) ── */
  const scanQuery = useQuery<ReconcileListResponse>({
    queryKey: ['/api/v1/characters/reconcile-list'],
    queryFn: () => apiPost<ReconcileListResponse>('/characters/reconcile-list', {}),
    enabled: false,
  });

  const orphans = scanQuery.data?.orphans ?? [];

  /* ── Delete mutation ── */
  const deleteMutation = useMutation({
    mutationFn: (paths: string[]) =>
      apiPost<ReconcileDeleteResponse>('/characters/reconcile-delete', { paths }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/characters/all'] });
      void scanQuery.refetch();
      setDeleteResult({ deleted: data.deleted.length, skipped: data.skipped.length });
      setSelected(new Set());
      setConfirmOpen(false);
    },
  });

  /* ── Handlers ── */
  const handleScan = useCallback(() => {
    setDeleteResult(null);
    setSelected(new Set());
    void scanQuery.refetch();
  }, [scanQuery]);

  const toggleSelect = useCallback((path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === orphans.length) return new Set();
      return new Set(orphans.map((o) => o.absolutePath));
    });
  }, [orphans]);

  const handleDeleteConfirm = useCallback(() => {
    const paths = Array.from(selected);
    if (paths.length === 0) return;
    deleteMutation.mutate(paths);
  }, [selected, deleteMutation]);

  const allSelected = orphans.length > 0 && selected.size === orphans.length;

  /* ──────────────────────── RENDER ──────────────────────── */

  return (
    <div data-panel="settings" className="section-rhythm relative isolate">
      {/* Section header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2.5">
            <span className="mono-tag text-ember">{`[07] — SYSTEM`}</span>
            <span className="bg-ember/40 h-px w-8" />
          </div>
          <h2 className="display-host text-[30px] leading-none tracking-tight">Settings</h2>
          <p className="text-muted-foreground mt-1.5 max-w-md text-[13px] leading-snug">
            Manage application settings, data, and maintenance.
          </p>
        </div>
      </header>

      {/* ── Character files reconciliation card ── */}
      <Card className={cn(surfaceCard, 'relative overflow-hidden rounded-sm')}>
        <CardHeader className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="display-host text-[15px] leading-tight">
                Character files
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-[12px] leading-snug">
                PNG files in your character folder that no character card in the database references.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleScan}
              disabled={scanQuery.isFetching}
              className="h-8 shrink-0"
            >
              {scanQuery.isFetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              <span className="mono-tag">
                {scanQuery.isFetching ? 'SCANNING…' : 'SCAN FOLDER'}
              </span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-4">
          {/* Scanning spinner */}
          {scanQuery.isFetching && (
            <div className="flex flex-col items-center justify-center gap-2 py-10">
              <Loader2 className="text-ember h-5 w-5 animate-spin" />
              <span className="mono-tag text-muted-foreground/55">scanning…</span>
            </div>
          )}

          {/* Error state */}
          {scanQuery.error && (
            <div className="border-destructive/40 bg-destructive/5 rounded-sm border p-3">
              <span className="mono-tag text-destructive">error</span>
              <p className="text-muted-foreground mt-1 text-[12px]">
                {scanQuery.error.message}
              </p>
            </div>
          )}

          {/* Delete error */}
          {deleteMutation.error && (
            <div className="border-destructive/40 bg-destructive/5 rounded-sm border p-3">
              <span className="mono-tag text-destructive">delete failed</span>
              <p className="text-muted-foreground mt-1 text-[12px]">
                {deleteMutation.error.message}
              </p>
            </div>
          )}

          {/* Success result */}
          {deleteResult && (
            <div className="border-ember/30 bg-ember/5 rounded-sm border p-3">
              <span className="mono-tag text-ember">done</span>
              <p className="text-muted-foreground mt-1 text-[12px]">
                Deleted {deleteResult.deleted} file(s)
                {deleteResult.skipped > 0
                  ? `, skipped ${deleteResult.skipped} (in use or protected)`
                  : ''}
              </p>
            </div>
          )}

          {/* Scanned data: empty state */}
          {!scanQuery.isFetching && scanQuery.isSuccess && orphans.length === 0 && (
            <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
              <div className="border-border bg-accent/40 mb-2 flex h-8 w-8 items-center justify-center rounded-sm border">
                <span className="display-host text-ember text-base">∅</span>
              </div>
              <p className="mono-tag text-foreground/60 mb-0.5">no orphans found</p>
              <p className="text-foreground/40 text-[10px]">
                all PNG files have matching database entries
              </p>
            </div>
          )}

          {/* Scanned data: orphan list */}
          {!scanQuery.isFetching && orphans.length > 0 && (
            <div className="space-y-1">
              {/* Select-all row */}
              <label className="flex cursor-pointer items-center gap-2 px-1 py-1 text-[12px] select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className={cn('h-3.5 w-3.5 rounded-sm border-border accent-ember')}
                />
                <span className="mono-tag text-muted-foreground/55">
                  {allSelected ? 'deselect all' : 'select all'}
                </span>
              </label>

              <div className="border-border/30 border-t" />

              {/* Orphan rows */}
              {orphans.map((orphan) => (
                <label
                  key={orphan.absolutePath}
                  className="flex cursor-pointer items-center gap-2.5 rounded-sm px-1 py-1.5 transition-colors hover:bg-accent/20"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(orphan.absolutePath)}
                    onChange={() => toggleSelect(orphan.absolutePath)}
                    className={cn('h-3.5 w-3.5 rounded-sm border-border accent-ember')}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground/80 truncate text-[12px]">
                        {orphan.fileName}
                      </span>
                      <span className="text-foreground/35 shrink-0 text-[11px] tabular-nums">
                        {formatBytes(orphan.sizeBytes)}
                      </span>
                    </div>
                    <span className="mono-tag text-muted-foreground/45 text-[10px]">
                      {reasonLabel(orphan)}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Footer: delete button */}
          {!scanQuery.isFetching && orphans.length > 0 && (
            <>
              <div className="border-border/30 my-2 border-t" />
              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmOpen(true)}
                  disabled={selected.size === 0}
                  className="h-8"
                >
                  <FileX className="h-3.5 w-3.5" />
                  <span className="mono-tag font-bold">
                    DELETE SELECTED ({selected.size})
                  </span>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete orphans"
        message={`Permanently delete ${selected.size} file(s)? This cannot be undone.`}
        confirmLabel="Delete"
      />
    </div>
  );
}
