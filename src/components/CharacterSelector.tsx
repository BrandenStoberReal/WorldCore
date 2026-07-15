import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ShallowCharacter } from '@/shared/types/character';

interface CharacterSelectorProps {
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function CharacterSelector({ selectedId, onSelect }: CharacterSelectorProps) {
  const [search, setSearch] = useState('');

  const { data: characters, isLoading } = useQuery<ShallowCharacter[]>({
    queryKey: ['/api/v1/characters/all', 'shallow'],
    queryFn: () =>
      apiFetch('/characters/all', {
        method: 'POST',
        body: JSON.stringify({ shallow: true }),
      }) as Promise<ShallowCharacter[]>,
  });

  const filtered = characters?.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  const sorted = filtered?.slice().sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="bg-sidebar text-sidebar-foreground flex h-full flex-col">
      {/* Header band */}
      <div className="border-sidebar-border shrink-0 border-b px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-baseline gap-2.5">
            <span className="mono-tag text-ember">[02]</span>
            <h3 className="display-host text-[18px] leading-none tracking-tight">Characters</h3>
          </div>
          <span className="mono-tag text-sidebar-foreground/45 tabular-nums">
            {String(filtered?.length ?? 0).padStart(2, '0')}
          </span>
        </div>

        <div className="relative">
          <Search className="text-sidebar-foreground/45 absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            placeholder="query · name fragment"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-sidebar-accent/40 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:border-ember h-8 pl-8 font-mono text-[12.5px] tracking-tight"
          />
        </div>
      </div>

      {/* List rail */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10">
            <Loader2 className="text-ember h-5 w-5 animate-spin" />
            <span className="mono-tag text-sidebar-foreground/50">loading characters</span>
          </div>
        ) : sorted && sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <div className="border-sidebar-border bg-sidebar-accent/40 mb-3 flex h-10 w-10 items-center justify-center rounded-sm border">
              <span className="display-host text-ember text-lg">∅</span>
            </div>
            <p className="mono-tag text-sidebar-foreground/60 mb-1">
              {characters?.length === 0 ? 'no entries' : 'no matches'}
            </p>
            <p className="text-sidebar-foreground/40 text-[11px]">
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
                    onClick={() => onSelect(char.id)}
                    className={cn(
                      'group relative flex w-full items-center gap-3 rounded-sm px-2.5 py-2 text-left transition-all duration-150',
                      active ? 'bg-sidebar-accent ember-pulse' : 'hover:bg-sidebar-accent/60',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-1/2 left-0 h-5 w-[2px] -translate-y-1/2 rounded-r-full transition-all',
                        active ? 'bg-ember opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="mono-tag text-sidebar-foreground/45 w-5 shrink-0 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="relative shrink-0">
                      <div className="border-sidebar-border bg-sidebar-accent/60 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border">
                        <img
                          src={`/api/v1/characters/avatar?id=${char.id}`}
                          alt={char.name}
                          className="h-8 w-8 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                      {active && (
                        <span className="border-ember/60 pointer-events-none absolute -inset-[2px] rounded-full border" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'truncate text-[13px] leading-tight font-medium',
                          active ? 'text-sidebar-foreground' : 'text-sidebar-foreground/85',
                        )}
                      >
                        {char.name}
                      </p>
                      <p className="mono-tag text-sidebar-foreground/45 mt-0.5 truncate">
                        {char.tags[0] ?? 'untagged'}
                      </p>
                    </div>
                    {active && <span className="mono-tag text-ember shrink-0">●</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
