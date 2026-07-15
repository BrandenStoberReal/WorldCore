import { useNavStore } from '@/lib/navStore';
import { useQuery } from '@tanstack/react-query';
import { Users, MessageSquare, Globe, Loader2, ArrowUpRight } from 'lucide-react';
import { cn, surfaceCard } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import type { ShallowCharacter } from '@/shared/types/character';

interface StatsResponse {
  characters?: number;
  chats?: number;
  worldinfo?: number;
  [key: string]: unknown;
}

export function WelcomePanel() {
  const { data: stats, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ['/api/v1/stats/get'],
    queryFn: async () => {
      const res = await fetch('/api/v1/stats/get');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      return Array.isArray(data) ? data : (data.results ?? data.data ?? data);
    },
  });

  const { data: characters } = useQuery<ShallowCharacter[]>({
    queryKey: ['/api/v1/characters/all', 'shallow'],
    queryFn: () =>
      apiFetch('/characters/all', {
        method: 'POST',
        body: JSON.stringify({ shallow: true }),
      }) as Promise<ShallowCharacter[]>,
  });

  const { data: chats } = useQuery({
    queryKey: ['/api/v1/chats/all'],
    queryFn: async () => {
      const res = await fetch('/api/v1/chats/all');
      if (!res.ok) throw new Error('Failed to fetch chats');
      const data = await res.json();
      return Array.isArray(data) ? data : ((data.results ?? data.data ?? data) as unknown[]);
    },
  });

  const { data: worldinfo } = useQuery({
    queryKey: ['/api/v1/worldinfo/all'],
    queryFn: async () => {
      const res = await fetch('/api/v1/worldinfo/all');
      if (!res.ok) throw new Error('Failed to fetch worldinfo');
      const data = await res.json();
      return Array.isArray(data) ? data : ((data.results ?? data.data ?? data) as unknown[]);
    },
  });

  const charCount = Array.isArray(characters) ? characters.length : (stats?.characters ?? 0);
  const chatCount = Array.isArray(chats) ? chats.length : (stats?.chats ?? 0);
  const wiCount = Array.isArray(worldinfo) ? worldinfo.length : (stats?.worldinfo ?? 0);

  const recent = Array.isArray(characters) ? characters.slice(0, 5) : [];

  return (
    <div className="relative isolate h-full p-6 md:p-10">
      {/* Forge glow halo behind hero */}
      <div aria-hidden className="ambient-glow pointer-events-none absolute inset-0" />

      <div className="section-rhythm relative">
        {/* Hero block */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="mono-tag text-ember">{`// 00 - ATELIER`}</span>
              <span className="bg-ember/40 h-px w-12" />
              <span className="mono-tag text-muted-foreground/55">{`seed · { sex, violins, vogon }`}</span>
            </div>
            <h1 className="display-host text-[82px] leading-[0.9] tracking-tighter md:text-[104px]">
              World
              <span className="text-ember italic">Core</span>
            </h1>
            <p className="text-foreground/65 mt-3 max-w-xl text-[15px] leading-relaxed">
              Manage character cards, lore tablets, extension modules, and live conversations — all
              from one place.
            </p>
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            <div className="flex items-center gap-3">
              <span className="mono-tag text-muted-foreground/55">METADATA</span>
              <span className="bg-border h-px w-8" />
            </div>
            <div className="bg-border border-border grid grid-cols-3 gap-px overflow-hidden rounded-sm border">
              <MetaCell label="BUILD" value="1a3f" />
              <MetaCell label="UPTIME" value="03:14" />
              <MetaCell label="CORE" value="1.42k" />
            </div>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatTile
            number="01"
            label="Characters"
            count={charCount}
            icon={Users}
            caption="characters · active"
            onClick={() => useNavStore.getState().toggleCharacters()}
            loading={statsLoading}
          />
          <StatTile
            number="02"
            label="Conversations"
            count={chatCount}
            icon={MessageSquare}
            caption="sessions · hot"
            onClick={() => useNavStore.getState().openSection('chats')}
            loading={statsLoading}
          />
          <StatTile
            number="03"
            label="World Info"
            count={wiCount}
            icon={Globe}
            caption="tablets · indexed"
            onClick={() => useNavStore.getState().openTopDrawer('worldinfo')}
            loading={statsLoading}
          />
        </div>

        {/* Two-column lower */}
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          {/* Quick actions */}
          <section className={cn(surfaceCard, 'relative overflow-hidden rounded-sm p-6 md:p-7')}>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="mono-tag text-ember">{`[01]`}</span>
                <h2 className="display-host text-[20px] tracking-tight">Quick Work</h2>
              </div>
              <span className="mono-tag text-muted-foreground/50">{`{ 3 actions }`}</span>
            </div>

            <div className="space-y-px">
              <ActionRow
                title="Browse Characters"
                caption={`${charCount} characters`}
                path="~/atelier/characters"
                onClick={() => useNavStore.getState().toggleCharacters()}
              />
              <ActionRow
                title="Open Chat Session"
                caption="Pick a persona and stoke"
                path="~/atelier/chats"
                onClick={() => useNavStore.getState().openSection('chats')}
              />
              <ActionRow
                title="Browse World Info"
                caption={`${wiCount} lore tablets live`}
                path="~/atelier/worldinfo"
                onClick={() => useNavStore.getState().openTopDrawer('worldinfo')}
              />
            </div>
          </section>

          {/* Recent characters */}
          <section className={cn(surfaceCard, 'relative overflow-hidden rounded-sm p-6 md:p-7')}>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="mono-tag text-ember">{`[02]`}</span>
                <h2 className="display-host text-[20px] tracking-tight">Fresh Castings</h2>
              </div>
              <ArrowUpRight
                className="text-muted-foreground/40 hover:text-ember h-4 w-4 cursor-pointer"
                onClick={() => useNavStore.getState().toggleCharacters()}
              />
            </div>

            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="border-border bg-muted/40 mb-3 flex h-12 w-12 items-center justify-center rounded-sm border">
                  <span className="display-host text-ember text-xl">∅</span>
                </div>
                <p className="mono-tag text-muted-foreground/55 mb-1">No entries</p>
                <p className="text-muted-foreground/45 max-w-[220px] text-xs">
                  No characters yet. Create your first character from the Characters page.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {recent.map((c, idx) => (
                  <li
                    key={c.id}
                    className="group hover:bg-accent/30 -mx-2 flex cursor-pointer items-center gap-3 rounded-sm px-2 py-2 transition-colors"
                    onClick={() => useNavStore.getState().toggleCharacters()}
                  >
                    <span className="mono-tag text-muted-foreground/45 w-5">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div className="border-border bg-muted/40 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border">
                      <img
                        src={`/api/v1/characters/avatar?id=${c.id}`}
                        alt={c.name}
                        className="h-8 w-8 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{c.name}</p>
                      <p className="mono-tag text-muted-foreground/55 mt-0.5 truncate">
                        {c.tags[0] ?? 'untagged'}
                      </p>
                    </div>
                    <ArrowUpRight className="text-muted-foreground/40 group-hover:text-ember h-3.5 w-3.5 opacity-0 transition-all group-hover:opacity-100" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Footer caption strip */}
        <footer className="border-border text-muted-foreground/45 flex items-center justify-between border-t pt-4">
          <span className="mono-tag">WorldCore</span>
          <span className="mono-tag">{`{⌑} in nomine ferri {⌑}`}</span>
        </footer>
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/40 px-3 py-2 text-center">
      <div className="mono-tag text-muted-foreground/55">{label}</div>
      <div className="mono-tag text-foreground mt-1 font-bold tabular-nums">{value}</div>
    </div>
  );
}

function StatTile({
  number,
  label,
  count,
  icon: Icon,
  caption,
  onClick,
  loading,
}: {
  number: string;
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  caption: string;
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        surfaceCard,
        'group relative overflow-hidden rounded-sm p-5 text-left',
        'transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_color-mix(in_oklch,var(--ember)_55%,transparent)]',
      )}
    >
      {/* ember accent strip */}
      <span
        aria-hidden
        className="via-ember/70 absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100"
      />
      {/* big watermark number */}
      <span
        className="display-host text-foreground/[0.04] pointer-events-none absolute -right-1 -bottom-3 text-[120px] leading-none select-none"
        aria-hidden
      >
        {number}
      </span>

      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon className="text-ember/80 group-hover:text-ember h-4 w-4 transition-colors" />
          <span className="mono-tag text-muted-foreground/70">{`/#${number}`}</span>
        </div>
        <ArrowUpRight className="text-muted-foreground/40 group-hover:text-ember h-4 w-4 transition-colors" />
      </div>

      <div className="display-host text-[56px] leading-none font-semibold tabular-nums">
        {loading ? <Loader2 className="text-muted-foreground/60 h-8 w-8 animate-spin" /> : count}
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[15px] font-semibold">{label}</span>
        <span className="mono-tag text-muted-foreground/50">{caption}</span>
      </div>
    </button>
  );
}

function ActionRow({
  title,
  caption,
  path,
  onClick,
}: {
  title: string;
  caption: string;
  path: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group border-border/60 hover:bg-accent/20 flex w-full items-center gap-4 border-t py-3 text-left transition-colors first:border-t-0"
    >
      <div className="border-border bg-background/40 group-hover:border-ember/50 group-hover:bg-ember/10 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border transition-colors">
        <ArrowUpRight className="text-muted-foreground/55 group-hover:text-ember h-3.5 w-3.5 transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium">{title}</div>
        <div className="mono-tag text-muted-foreground/55 mt-0.5 truncate">{caption}</div>
      </div>
      <div className="mono-tag text-muted-foreground/35 hidden md:block">{path}</div>
    </button>
  );
}
