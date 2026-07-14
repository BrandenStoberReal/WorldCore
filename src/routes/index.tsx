import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, MessageSquare, Globe, Loader2, ArrowUpRight } from "lucide-react";
import { cn, surfaceCard } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import type { ShallowCharacter } from "@/shared/types/character";

interface StatsResponse {
  characters?: number;
  chats?: number;
  worldinfo?: number;
  [key: string]: unknown;
}

export function Component() {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ["/api/v1/stats/get"],
    queryFn: async () => {
      const res = await fetch("/api/v1/stats/get");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.results ?? data.data ?? data);
    },
  });

  const { data: characters } = useQuery<ShallowCharacter[]>({
    queryKey: ["/api/v1/characters/all", "shallow"],
    queryFn: () =>
      apiFetch("/characters/all", {
        method: "POST",
        body: JSON.stringify({ shallow: true }),
      }) as Promise<ShallowCharacter[]>,
  });

  const { data: chats } = useQuery({
    queryKey: ["/api/v1/chats/all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/chats/all");
      if (!res.ok) throw new Error("Failed to fetch chats");
      const data = await res.json();
      return Array.isArray(data)
        ? data
        : (data.results ?? data.data ?? data) as unknown[];
    },
  });

  const { data: worldinfo } = useQuery({
    queryKey: ["/api/v1/worldinfo/all"],
    queryFn: async () => {
      const res = await fetch("/api/v1/worldinfo/all");
      if (!res.ok) throw new Error("Failed to fetch worldinfo");
      const data = await res.json();
      return Array.isArray(data)
        ? data
        : (data.results ?? data.data ?? data) as unknown[];
    },
  });

  const charCount = Array.isArray(characters) ? characters.length : (stats?.characters ?? 0);
  const chatCount = Array.isArray(chats) ? chats.length : (stats?.chats ?? 0);
  const wiCount = Array.isArray(worldinfo) ? worldinfo.length : (stats?.worldinfo ?? 0);

  const recent = Array.isArray(characters) ? characters.slice(0, 5) : [];

  return (
    <div className="relative isolate">
      {/* Forge glow halo behind hero */}
      <div aria-hidden className="pointer-events-none absolute inset-0 ambient-glow" />

      <div className="relative">
        {/* Hero block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="mono-tag text-ember">{`// 00 - ATELIER`}</span>
              <span className="h-px w-12 bg-ember/40" />
              <span className="mono-tag text-muted-foreground/55">{`seed · { sex, violins, vogon }`}</span>
            </div>
            <h1
              className="display-host text-[82px] md:text-[104px] leading-[0.9] tracking-tighter"
            >
              World
              <span className="text-ember italic">Core</span>
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-foreground/65">
              Manage character cards, lore tablets,
              extension modules, and live conversations — all from one place.
            </p>
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            <div className="flex items-center gap-3">
              <span className="mono-tag text-muted-foreground/55">METADATA</span>
              <span className="h-px w-8 bg-border" />
            </div>
            <div className="grid grid-cols-3 gap-px bg-border border border-border rounded-sm overflow-hidden">
              <MetaCell label="BUILD" value="1a3f" />
              <MetaCell label="UPTIME" value="03:14" />
              <MetaCell label="CORE" value="1.42k" />
            </div>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid gap-4 md:grid-cols-3 mb-10">
          <StatTile
            number="01"
            label="Characters"
            count={charCount}
            icon={Users}
            caption="characters · active"
            onClick={() => navigate({ to: "/characters" })}
            loading={statsLoading}
          />
          <StatTile
            number="02"
            label="Conversations"
            count={chatCount}
            icon={MessageSquare}
            caption="sessions · hot"
            onClick={() => navigate({ to: "/chats" })}
            loading={statsLoading}
          />
          <StatTile
            number="03"
            label="World Info"
            count={wiCount}
            icon={Globe}
            caption="tablets · indexed"
            onClick={() => navigate({ to: "/worldinfo" })}
            loading={statsLoading}
          />
        </div>

        {/* Two-column lower */}
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          {/* Quick actions */}
          <section
            className={cn(
              surfaceCard,
              "relative rounded-sm p-6 overflow-hidden",
            )}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="mono-tag text-ember">{`[01]`}</span>
                <h2 className="display-host text-[20px] tracking-tight">
                  Quick Work
                </h2>
              </div>
              <span className="mono-tag text-muted-foreground/50">{`{ 3 actions }`}</span>
            </div>

            <div className="space-y-px">
              <ActionRow
                title="Browse Characters"
                caption={`${charCount} characters`}
                path="~/atelier/characters"
                onClick={() => navigate({ to: "/characters" })}
              />
              <ActionRow
                title="Open Chat Session"
                caption="Pick a persona and stoke"
                path="~/atelier/chats"
                onClick={() => navigate({ to: "/chats" })}
              />
              <ActionRow
                title="Browse World Info"
                caption={`${wiCount} lore tablets live`}
                path="~/atelier/worldinfo"
                onClick={() => navigate({ to: "/worldinfo" })}
              />
            </div>
          </section>

          {/* Recent characters */}
          <section
            className={cn(
              surfaceCard,
              "relative rounded-sm p-6 overflow-hidden",
            )}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="mono-tag text-ember">{`[02]`}</span>
                <h2 className="display-host text-[20px] tracking-tight">
                  Fresh Castings
                </h2>
              </div>
              <ArrowUpRight
                className="h-4 w-4 text-muted-foreground/40 cursor-pointer hover:text-ember"
                onClick={() => navigate({ to: "/characters" })}
              />
            </div>

            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-sm border border-border bg-muted/40">
                  <span className="display-host text-ember text-xl">∅</span>
                </div>
                <p className="mono-tag text-muted-foreground/55 mb-1">
                  No entries
                </p>
                <p className="text-xs text-muted-foreground/45 max-w-[220px]">
                  No characters yet. Create your first character from the
                  Characters page.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {recent.map((c, idx) => (
                  <li
                    key={c.id}
                    className="group flex items-center gap-3 px-2 py-2 -mx-2 rounded-sm hover:bg-accent/30 cursor-pointer transition-colors"
                    onClick={() => navigate({ to: "/characters" })}
                  >
                    <span className="mono-tag text-muted-foreground/45 w-5">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full overflow-hidden border border-border bg-muted/40">
                      <img
                        src={`/api/v1/characters/avatar?id=${c.id}`}
                        alt={c.name}
                        className="h-8 w-8 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">
                        {c.name}
                      </p>
                      <p className="mono-tag text-muted-foreground/55 truncate mt-0.5">
                        {c.tags[0] ?? "untagged"}
                      </p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 group-hover:text-ember transition-all" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Footer caption strip */}
        <footer className="mt-10 pt-4 border-t border-border flex items-center justify-between text-muted-foreground/45">
          <span className="mono-tag">WorldCore</span>
          <span className="mono-tag">{`{⌑} in nomine ferri {⌑}`}</span>
        </footer>
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 bg-background/40 text-center">
      <div className="mono-tag text-muted-foreground/55">{label}</div>
      <div className="mono-tag text-foreground font-bold mt-1 tabular-nums">
        {value}
      </div>
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
        "group relative text-left p-5 rounded-sm overflow-hidden",
        "transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-12px_color-mix(in_oklch,var(--ember)_55%,transparent)]",
      )}
    >
      {/* ember accent strip */}
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-ember/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
      />
      {/* big watermark number */}
      <span
        className="absolute -bottom-3 -right-1 display-host text-[120px] leading-none text-foreground/[0.04] pointer-events-none select-none"
        aria-hidden
      >
        {number}
      </span>

      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-ember/80 group-hover:text-ember transition-colors" />
          <span className="mono-tag text-muted-foreground/70">{`/#${number}`}</span>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-ember transition-colors" />
      </div>

      <div className="display-host text-[56px] leading-none font-semibold tabular-nums">
        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/60" />
        ) : (
          count
        )}
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
      className="group w-full text-left flex items-center gap-4 py-3 border-t border-border/60 first:border-t-0 hover:bg-accent/20 transition-colors"
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-background/40 group-hover:border-ember/50 group-hover:bg-ember/10 transition-colors shrink-0">
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/55 group-hover:text-ember transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-medium">{title}</div>
        <div className="mono-tag text-muted-foreground/55 mt-0.5 truncate">
          {caption}
        </div>
      </div>
      <div className="mono-tag text-muted-foreground/35 hidden md:block">
        {path}
      </div>
    </button>
  );
}
