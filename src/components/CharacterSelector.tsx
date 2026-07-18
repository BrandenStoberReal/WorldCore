import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Users, Loader2, Plus, Trash2, Upload, ArrowLeft, PencilLine } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { useChatStore } from '@/lib/stores';
import { useNavStore } from '@/lib/navStore';
import type { Character, ShallowCharacter } from '@/shared/types/character';

type CharacterWithId = Character & { id: number };

interface CharacterSelectorProps {
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function CharacterSelector({ selectedId, onSelect }: CharacterSelectorProps) {
  const queryClient = useQueryClient();
  const [sidebarMode, setSidebarMode] = useState<'list' | 'info'>('list');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openSection = useNavStore((s) => s.openSection);
  const setActiveCharacter = useChatStore((s) => s.setActiveCharacter);

  /* ── list-mode query (always fetched so row highlight + count work) ── */
  const { data: characters, isLoading } = useQuery<ShallowCharacter[]>({
    queryKey: ['/api/v1/characters/all', 'shallow'],
    queryFn: () =>
      apiFetch('/characters/all', {
        method: 'POST',
        body: JSON.stringify({ shallow: true }),
      }) as Promise<ShallowCharacter[]>,
  });

  /* ── info-mode: fetch full character card ── */
  const { data: infoCharacter, isLoading: infoLoading } = useQuery<CharacterWithId>({
    queryKey: ['/api/v1/characters/get', selectedId],
    queryFn: () =>
      apiFetch('/characters/get', {
        method: 'POST',
        body: JSON.stringify({ id: selectedId }),
      }) as Promise<CharacterWithId>,
    enabled: sidebarMode === 'info' && selectedId != null,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiFetch('/characters/delete', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/characters/all'] });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/v1/characters/import', { method: 'POST', body: fd });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Import failed (${res.status}): ${text}`);
      }
      return (await res.json()) as { ok: true; id: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/characters/all'] });
    },
    onError: (err) => {
      console.error('character import failed', err);
    },
  });

  /* ── handlers ── */
  function handleCreate() {
    setActiveCharacter(null);
    openSection('characters');
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    importMutation.mutate(file);
  }

  function handleSelect(id: number) {
    onSelect(id);
    setSidebarMode('info');
  }

  function handleBack() {
    setSidebarMode('list');
  }

  function handleEdit() {
    openSection('characters');
  }

  // Reset to list view when the selected character is cleared (e.g. EditMode's
  // Cancel calls setActiveCharacter(null)). Without this, the sidebar stays in
  // 'info' mode with selectedId=null and renders the loading branch forever
  // because the info query is disabled and `infoCharacter` stays undefined.
  useEffect(() => {
    if (selectedId == null && sidebarMode === 'info') {
      setSidebarMode('list');
    }
  }, [selectedId, sidebarMode]);

  /* ── derived list data ── */
  const filtered = characters?.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const sorted = filtered?.slice().sort((a, b) => a.name.localeCompare(b.name));

  /* ──────────────────────── LIST MODE ──────────────────────── */
  if (sidebarMode === 'list') {
    return (
      <div className="flex h-full flex-col">
        {/* Header band */}
        <div className="border-border/40 border-b px-2.5 pt-2.5 pb-2">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Users className="text-ember h-3 w-3" strokeWidth={2} />
              <span className="display-host text-[13px] leading-none">Characters</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="mono-tag text-foreground/40 tabular-nums">
                {String(filtered?.length ?? 0).padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={handleCreate}
                title="New character"
                aria-label="New character"
                className="text-foreground/40 hover:text-ember hover:bg-accent/30 rounded-sm p-0.5 transition-colors"
              >
                <Plus className="h-3 w-3" strokeWidth={2.25} />
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={importMutation.isPending}
                title="Import character PNG"
                aria-label="Import character PNG"
                className="text-foreground/40 hover:text-ember hover:bg-accent/30 rounded-sm p-0.5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {importMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.25} />
                ) : (
                  <Upload className="h-3 w-3" strokeWidth={2.25} />
                )}
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="text-foreground/45 absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2" />
            <input
              type="text"
              placeholder="query · name fragment"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search characters"
              className={cn(
                'border-border bg-background/60 h-6 w-full rounded-sm border pr-2 pl-[22px]',
                'text-foreground/80 placeholder:text-foreground/25 text-[11px] outline-none',
                'focus:border-ember/50',
              )}
            />
          </div>
        </div>

        {/* List rail */}
        <div className="flex-1 overflow-y-auto py-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-1.5 py-8">
              <Loader2 className="text-ember h-4 w-4 animate-spin" />
              <span className="mono-tag text-foreground/50">loading characters</span>
            </div>
          ) : sorted && sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
              <div className="border-border bg-accent/40 mb-2 flex h-8 w-8 items-center justify-center rounded-sm border">
                <span className="display-host text-ember text-base">∅</span>
              </div>
              <p className="mono-tag text-foreground/60 mb-0.5">
                {characters?.length === 0 ? 'no entries' : 'no matches'}
              </p>
              <p className="text-foreground/40 text-[10px]">
                {characters?.length === 0 ? 'create a character first' : 'no characters match'}
              </p>
            </div>
          ) : (
            <ul className="space-y-px">
              {sorted?.map((char, idx) => {
                const active = selectedId === char.id;
                return (
                  <li key={char.id}>
                    <button
                      onClick={() => handleSelect(char.id)}
                      className={cn(
                        'group relative flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left transition-all duration-150',
                        active ? 'bg-accent/40 ember-pulse' : 'hover:bg-accent/30',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-1/2 left-0 h-4 w-[2px] -translate-y-1/2 rounded-r-full transition-all',
                          active ? 'bg-ember opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className="mono-tag text-foreground/45 w-4 shrink-0 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="relative shrink-0">
                          <div className="border-border bg-accent/40 flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border">
                            <img
                              src={`/api/v1/characters/thumbnail?id=${char.id}`}
                              alt={char.name}
                              className="h-7 w-7 rounded-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        {active && (
                          <span className="border-ember/60 pointer-events-none absolute -inset-[1.5px] rounded-full border" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            'truncate text-[12px] leading-tight font-medium',
                            active ? 'text-foreground' : 'text-foreground/85',
                          )}
                        >
                          {char.name}
                        </p>
                        <p className="mono-tag text-foreground/45 mt-px truncate">
                          {char.tags[0] ?? 'untagged'}
                        </p>
                      </div>
                      {/* Row actions — appear on hover */}
                      <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(char.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              e.preventDefault();
                              setDeleteId(char.id);
                            }
                          }}
                          title="Delete character"
                          aria-label={`Delete ${char.name}`}
                          className="text-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-sm p-0.5 transition-colors"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </span>
                      </span>
                      {active && (
                        <span className="mono-tag text-ember shrink-0 group-hover:hidden">●</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Delete Confirm */}
        <ConfirmDialog
          open={deleteId != null}
          onClose={() => setDeleteId(null)}
          onConfirm={() => deleteId != null && deleteMutation.mutate(deleteId)}
          title="Condemn to Slag"
          message="Cast this persona into the slag heap? This action is irreversible — the character card will be lost forever."
          confirmLabel="Condemn"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>
    );
  }

  /* ──────────────────────── INFO MODE ──────────────────────── */
  return (
    <div className="flex h-full flex-col">
      {/* Header — back arrow */}
      <div className="border-border/40 flex items-center gap-2 border-b px-2.5 py-2">
        <button
          type="button"
          onClick={handleBack}
          title="Back to list"
          aria-label="Back to character list"
          className="text-foreground/40 hover:text-foreground hover:bg-accent/30 rounded-sm p-0.5 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>
        <span className="mono-tag text-foreground/45">BACK</span>
      </div>

      {/* Card body */}
      {infoLoading || !infoCharacter ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2">
          <Loader2 className="text-ember h-4 w-4 animate-spin" />
          <span className="mono-tag text-foreground/50">loading character</span>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-y-auto px-3 py-3">
          {/* Avatar + Name */}
          <div className="flex flex-col items-center gap-2.5 pb-3">
            <div className="border-border bg-accent/40 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border">
              <img
                src={`/api/v1/characters/thumbnail?id=${selectedId}&v=${Date.now()}`}
                alt={infoCharacter.name}
                className="h-16 w-16 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <h3 className="display-host text-[16px] leading-tight">{infoCharacter.name}</h3>
              <span className="mono-tag text-foreground/35">
                #{String(selectedId).padStart(4, '0')}
              </span>
            </div>
          </div>

          {/* Tags */}
          {infoCharacter.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pb-3">
              {infoCharacter.tags.map((tag) => (
                <span
                  key={tag}
                  className="mono-tag bg-muted/50 border-border/60 text-foreground/65 rounded-sm border px-1.5 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <div className="pb-3">
            {infoCharacter.description ? (
              <p className="text-foreground/70 whitespace-pre-wrap break-words text-[12px] leading-relaxed line-clamp-6">
                {infoCharacter.description}
              </p>
            ) : (
              <p className="mono-tag text-muted-foreground/40 italic text-[11px]">no description</p>
            )}
          </div>

          {/* Creator notes preview (if present) */}
          {infoCharacter.creator_notes && (
            <div className="border-border/30 mb-3 border-t pt-2.5">
              <span className="mono-tag text-foreground/35 mb-1 block text-[10px]">notes</span>
              <p className="text-foreground/55 whitespace-pre-wrap break-words text-[11px] leading-relaxed line-clamp-3">
                {infoCharacter.creator_notes}
              </p>
            </div>
          )}

          {/* Stats row */}
          <div className="flex flex-wrap gap-1.5 pb-3">
            {infoCharacter.creator && (
              <span className="mono-tag bg-muted/30 text-foreground/45 border-border/30 rounded-sm border px-1.5 py-0.5 text-[10px]">
                {infoCharacter.creator}
              </span>
            )}
            {infoCharacter.character_version && (
              <span className="mono-tag bg-muted/30 text-foreground/45 border-border/30 rounded-sm border px-1.5 py-0.5 text-[10px]">
                v{infoCharacter.character_version}
              </span>
            )}
            <span className="mono-tag bg-muted/30 text-foreground/45 border-border/30 rounded-sm border px-1.5 py-0.5 text-[10px]">
              {infoCharacter.tags.length} tags
            </span>
          </div>

          {/* Spacer pushes buttons to bottom */}
          <div className="min-h-2 flex-1" />
        </div>
      )}

      {/* Footer — Edit + Back */}
      <div className="border-border/40 flex flex-col gap-1.5 border-t px-2.5 py-2.5">
        <Button
          variant="default"
          size="sm"
          onClick={handleEdit}
          disabled={infoLoading || !infoCharacter}
          className="w-full"
        >
          <PencilLine className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button variant="outline" size="sm" onClick={handleBack} className="w-full">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
      </div>
    </div>
  );
}
