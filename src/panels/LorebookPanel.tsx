import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useChatStore } from '@/lib/stores';
import { useDebouncedAutoSave } from '@/hooks';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { CharacterBook, CharacterBookEntry, Character } from '@/shared/types/character';

// ── Types ────────────────────────────────────────────────
type CharacterWithId = Character & { id: number };

// ── Constants ────────────────────────────────────────────
const POSITION_LITERALS = [
  'before_char',
  'after_char',
  "at_end as an author's note",
  'in-chat',
] as const;

const CUSTOM_POSITION_SENTINEL = '__custom__';

const EMPTY_BOOK: CharacterBook = {
  name: '',
  description: '',
  scan_depth: undefined,
  token_budget: undefined,
  recursive_scanning: false,
  entries: [],
  extensions: undefined,
};

// ── Helpers ──────────────────────────────────────────────
function createNewEntry(): CharacterBookEntry {
  return {
    id: crypto.randomUUID(),
    name: '',
    keys: [],
    secondary_keys: [],
    comment: '',
    content: '',
    constant: false,
    selective: false,
    insertion_order: 0,
    priority: 10,
    enabled: true,
    case_sensitive: false,
    position: 0,
    use_regex: false,
  };
}

function bookEquals(a: CharacterBook | undefined, b: CharacterBook | undefined): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

// ── Sub-components ───────────────────────────────────────

function PanelHeader({
  characterName,
  statusBadge,
}: {
  characterName?: string;
  statusBadge?: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-2',
        'border-border/40 border-b',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="mono-tag text-ember">[LOREBOOK] · FORGE</span>
        <span className="bg-border/50 h-px w-6" />
        <h2 className="display-host text-[14px] leading-none tracking-tight">
          <span className="truncate">{characterName ?? 'Lorebook'}</span>
        </h2>
      </div>
      {statusBadge}
    </header>
  );
}

function CharCounter({ count, max }: { count: number; max?: number }) {
  return (
    <span className="mono-tag text-muted-foreground/40 text-[10px] tabular-nums">
      {max ? `${count} / ${max}` : count}
    </span>
  );
}

function FieldLabel({ label, count, max }: { label: string; count?: number; max?: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-sm font-medium">{label}</Label>
      {count !== undefined && <CharCounter count={count} max={max} />}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm font-medium">{label}</Label>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={cn(
          'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
          checked ? 'bg-ember' : 'bg-muted-foreground/25',
        )}
        onClick={() => onChange(!checked)}
      >
        <span
          className={cn(
            'bg-background pointer-events-none block h-4 w-4 rounded-full shadow-lg ring-0 transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  );
}

function PositionSelect({
  value,
  onChange,
}: {
  value: CharacterBookEntry['position'];
  onChange: (v: CharacterBookEntry['position']) => void;
}) {
  const isCustomNumber = typeof value === 'number';

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Position</Label>
      <div className="flex gap-2">
        <select
          className={cn(
            'border-input h-9 cursor-pointer rounded-md border bg-transparent px-3 py-1 text-base shadow-xs md:text-sm',
            'focus-visible:border-ring focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]',
          )}
          value={isCustomNumber ? CUSTOM_POSITION_SENTINEL : value}
          onChange={(e) => {
            const v = e.target.value;
            if (v === CUSTOM_POSITION_SENTINEL) {
              onChange(typeof value === 'number' ? value : 0);
            } else {
              onChange(v as CharacterBookEntry['position']);
            }
          }}
        >
          {POSITION_LITERALS.map((lit) => (
            <option key={lit} value={lit}>
              {lit}
            </option>
          ))}
          <option value={CUSTOM_POSITION_SENTINEL}>Custom number</option>
        </select>
        {isCustomNumber && (
          <Input
            type="number"
            className="w-24"
            value={value}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
          />
        )}
      </div>
    </div>
  );
}

// ── Entry Row ────────────────────────────────────────────

function EntryRow({
  entry,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
}: {
  entry: CharacterBookEntry;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<CharacterBookEntry>) => void;
  onDelete: () => void;
}) {
  const keysInput = entry.keys.join(', ');
  const secondaryKeysInput = entry.secondary_keys.join(', ');

  return (
    <Card className="group/entry gap-2 py-2">
      {/* Collapsed header — always visible */}
      <div
        role="button"
        tabIndex={0}
        className="flex cursor-pointer items-center gap-2 px-4"
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        {isExpanded ? (
          <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" />
        )}
        <span className="truncate text-sm font-medium">{entry.name || `Entry ${index + 1}`}</span>
        {!entry.enabled && (
          <span className="mono-tag text-muted-foreground/40 text-[10px]">disabled</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground/40 hover:text-destructive h-auto shrink-0 opacity-0 transition-opacity group-hover/entry:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expanded fields */}
      {isExpanded && (
        <div className="border-border/20 space-y-3 border-t px-4 pt-3">
          {/* Name */}
          <div className="space-y-1.5">
            <FieldLabel label="Name" count={entry.name.length} />
            <Input
              value={entry.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Entry name"
            />
          </div>

          {/* Keys */}
          <div className="space-y-1.5">
            <FieldLabel label="Keys" count={entry.keys.length} />
            <Input
              value={keysInput}
              onChange={(e) =>
                onUpdate({
                  keys: e.target.value
                    .split(',')
                    .map((k) => k.trim())
                    .filter(Boolean),
                })
              }
              placeholder="comma, separated, keywords"
            />
          </div>

          {/* Secondary Keys */}
          <div className="space-y-1.5">
            <FieldLabel label="Secondary Keys" count={entry.secondary_keys.length} />
            <Input
              value={secondaryKeysInput}
              onChange={(e) =>
                onUpdate({
                  secondary_keys: e.target.value
                    .split(',')
                    .map((k) => k.trim())
                    .filter(Boolean),
                })
              }
              placeholder="comma, separated, keywords"
            />
          </div>

          {/* Comment */}
          <div className="space-y-1.5">
            <FieldLabel label="Comment" count={entry.comment.length} />
            <Input
              value={entry.comment}
              onChange={(e) => onUpdate({ comment: e.target.value })}
              placeholder="Internal note"
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <FieldLabel label="Content" count={entry.content.length} />
            <Textarea
              value={entry.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              placeholder="Lorebook content to inject"
              rows={4}
              className="font-mono text-xs"
            />
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-3">
            <Toggle
              checked={entry.constant}
              onChange={(v) => onUpdate({ constant: v })}
              label="Constant"
            />
            <Toggle
              checked={entry.selective}
              onChange={(v) => onUpdate({ selective: v })}
              label="Selective"
            />
            <Toggle
              checked={entry.enabled}
              onChange={(v) => onUpdate({ enabled: v })}
              label="Enabled"
            />
            <Toggle
              checked={entry.case_sensitive}
              onChange={(v) => onUpdate({ case_sensitive: v })}
              label="Case Sensitive"
            />
            <Toggle
              checked={entry.use_regex}
              onChange={(v) => onUpdate({ use_regex: v })}
              label="Use Regex"
            />
          </div>

          {/* Number fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Insertion Order</Label>
              <Input
                type="number"
                value={entry.insertion_order}
                onChange={(e) => onUpdate({ insertion_order: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Priority</Label>
              <Input
                type="number"
                value={entry.priority}
                onChange={(e) => onUpdate({ priority: Number(e.target.value) || 10 })}
              />
            </div>
          </div>

          {/* Position */}
          <PositionSelect value={entry.position} onChange={(v) => onUpdate({ position: v })} />
        </div>
      )}
    </Card>
  );
}

// ── Main Editor ──────────────────────────────────────────

function LorebookEditor({ characterId }: { characterId: number }) {
  const queryClient = useQueryClient();

  const { data: editCharacter, isLoading: charLoading } = useQuery<CharacterWithId>({
    queryKey: ['/api/v1/characters/get', characterId],
    queryFn: () =>
      apiFetch('/characters/get', {
        method: 'POST',
        body: JSON.stringify({ id: characterId }),
      }) as Promise<CharacterWithId>,
  });

  const editMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { character_book: CharacterBook | undefined };
    }) => {
      await apiFetch('/characters/edit', {
        method: 'POST',
        body: JSON.stringify({ id, data }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/characters/all'] });
    },
  });

  const bookDraft = useMemo(() => editCharacter?.character_book, [editCharacter]);

  const autosave = useDebouncedAutoSave<CharacterBook | undefined>({
    value: bookDraft,
    save: (book) =>
      editCharacter
        ? editMutation.mutateAsync({ id: editCharacter.id, data: { character_book: book } })
        : Promise.resolve(),
    delayMs: 800,
    equals: bookEquals,
  });

  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // ── Handlers ─────────────────────────────────────────
  const book = autosave.local;

  const handleCreateBook = () => {
    autosave.setLocal(EMPTY_BOOK);
  };

  const updateBookField = <K extends keyof CharacterBook>(key: K, value: CharacterBook[K]) => {
    if (book == null) return;
    autosave.setLocal({ ...book, [key]: value });
  };

  const updateEntry = (index: number, patch: Partial<CharacterBookEntry>) => {
    if (book == null) return;
    const entry = book.entries[index];
    if (entry == null) return;
    const newEntries = [...book.entries];
    newEntries[index] = { ...entry, ...patch };
    autosave.setLocal({ ...book, entries: newEntries });
  };

  const addEntry = () => {
    if (book == null) return;
    const newEntry = createNewEntry();
    autosave.setLocal({ ...book, entries: [...book.entries, newEntry] });
    setExpandedIdx(book.entries.length);
  };

  const deleteEntry = (index: number) => {
    if (book == null) return;
    const newEntries = book.entries.filter((_, i) => i !== index);
    autosave.setLocal({ ...book, entries: newEntries });
    if (expandedIdx === index) {
      setExpandedIdx(null);
    } else if (expandedIdx != null && expandedIdx > index) {
      setExpandedIdx(expandedIdx - 1);
    }
  };

  // ── Loading ──────────────────────────────────────────
  if (charLoading || !editCharacter) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Loader2 className="text-ember h-6 w-6 animate-spin" />
        <span className="mono-tag text-muted-foreground/55">loading character</span>
      </div>
    );
  }

  const statusBadge =
    autosave.status !== 'idle' ? (
      <span
        className={cn(
          'mono-tag text-[10px]',
          autosave.status === 'error' ? 'text-destructive' : 'text-muted-foreground/40',
        )}
      >
        {autosave.status}
      </span>
    ) : null;

  return (
    <div className="flex h-full flex-col">
      <PanelHeader characterName={editCharacter.name} statusBadge={statusBadge} />
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl">
          {book == null ? (
            /* No character_book yet */
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <span className="mono-tag text-muted-foreground/55">No lorebook yet</span>
              <Button variant="outline" size="sm" onClick={handleCreateBook}>
                <Plus className="h-4 w-4" />
                Create Lorebook
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ── Book Settings ─────────────────────── */}
              <Card className="gap-4 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
                    Book Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4">
                  <div className="space-y-1.5">
                    <FieldLabel label="Name" count={book.name.length} />
                    <Input
                      value={book.name}
                      onChange={(e) => updateBookField('name', e.target.value)}
                      placeholder="Lorebook name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel label="Description" count={book.description.length} />
                    <Textarea
                      value={book.description}
                      onChange={(e) => updateBookField('description', e.target.value)}
                      placeholder="Lorebook description"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Scan Depth</Label>
                      <Input
                        type="number"
                        value={book.scan_depth ?? ''}
                        onChange={(e) =>
                          updateBookField(
                            'scan_depth',
                            e.target.value === '' ? undefined : Number(e.target.value),
                          )
                        }
                        placeholder="Optional"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Token Budget</Label>
                      <Input
                        type="number"
                        value={book.token_budget ?? ''}
                        onChange={(e) =>
                          updateBookField(
                            'token_budget',
                            e.target.value === '' ? undefined : Number(e.target.value),
                          )
                        }
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <Toggle
                    checked={book.recursive_scanning}
                    onChange={(v) => updateBookField('recursive_scanning', v)}
                    label="Recursive Scanning"
                  />
                </CardContent>
              </Card>

              {/* ── Entries ──────────────────────────── */}
              <Card className="gap-4 py-4">
                <CardHeader className="px-4">
                  <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
                    Entries
                    <span className="mono-tag text-muted-foreground/40 ml-2 text-[10px] tabular-nums">
                      {book.entries.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-4">
                  {book.entries.map((entry, i) => (
                    <EntryRow
                      key={entry.id ?? i}
                      entry={entry}
                      index={i}
                      isExpanded={expandedIdx === i}
                      onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
                      onUpdate={(patch) => updateEntry(i, patch)}
                      onDelete={() => deleteEntry(i)}
                    />
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-dashed"
                    onClick={addEntry}
                  >
                    <Plus className="h-4 w-4" />
                    Add Entry
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Exported Panel ────────────────────────────────────────

export function LorebookPanel() {
  const activeCharacterId = useChatStore((s) => s.activeCharacterId);

  return (
    <div
      data-panel="lorebook"
      className="bg-background flex h-full w-full flex-1 flex-col overflow-hidden"
    >
      {activeCharacterId == null ? (
        <div className="text-muted-foreground/45 flex h-full items-center justify-center">
          <span className="mono-tag">Select a character to edit its lorebook</span>
        </div>
      ) : (
        <LorebookEditor key={activeCharacterId} characterId={activeCharacterId} />
      )}
    </div>
  );
}
