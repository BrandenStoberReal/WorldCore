import { useEffect } from "react";
import { useChatStore } from "@/lib/stores";
import { CharacterSelector } from "@/components/CharacterSelector";
import { ChatView } from "@/components/ChatView";
import { cn } from "@/lib/utils";

export function Component() {
  const { activeCharacterId, setActiveCharacter } = useChatStore();

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeCharacterId) {
        setActiveCharacter(null);
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [activeCharacterId, setActiveCharacter]);

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">
      {/* Character rail — expands to fill when no chat selected */}
      <aside
        className={cn(
          "shrink-0 border-r border-border bg-sidebar transition-[width] duration-300 ease-out",
          activeCharacterId ? "w-[260px]" : "w-full max-w-[560px]",
        )}
      >
        <CharacterSelector
          selectedId={activeCharacterId}
          onSelect={setActiveCharacter}
        />
      </aside>

      {/* Hammer rail — the visual double-strike divider */}
      {activeCharacterId != null && (
        <div
          aria-hidden
          className="w-[1px] bg-gradient-to-b from-transparent via-ember/40 to-transparent"
        />
      )}

      {/* Main chat area */}
      {activeCharacterId != null ? (
        <section className="flex flex-1 flex-col overflow-hidden min-w-0">
          <ChatView characterId={activeCharacterId} />
        </section>
      ) : (
        <section className="flex flex-1 items-center justify-center relative min-w-0">
          {/* Ambience */}
          <div aria-hidden className="pointer-events-none absolute inset-0 ambient-glow" />

          <div className="relative text-center max-w-md px-8">
            {/* Heat indicator */}
            <div className="relative mx-auto mb-8 h-32 w-32">
              <div
                className="absolute inset-0 rounded-full border border-ember/30"
                style={{
                  background:
                    "radial-gradient(circle at 50% 60%, color-mix(in oklch, var(--ember) 35%, transparent) 0%, transparent 70%)",
                }}
              />
              {/* concentric rivets */}
              <div
                className="absolute inset-3 rounded-full border border-border/60 flex items-center justify-center"
                style={{
                  animation: "ember-pulse 3s ease-in-out infinite",
                }}
              >
                <span
                  className="display-host text-[64px] leading-none text-ember italic"
                  aria-hidden
                >
                  ⌑
                </span>
              </div>
              {/* outer registration ticks */}
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="absolute top-1/2 left-1/2 w-2.5 h-px bg-ember/40"
                  style={{
                    transform: [
                      "translate(-50%, -50%) rotate(0deg) translateX(56px)",
                      "translate(-50%, -50%) rotate(90deg) translateX(56px)",
                      "translate(-50%, -50%) rotate(180deg) translateX(56px)",
                      "translate(-50%, -50%) rotate(270deg) translateX(56px)",
                    ][i],
                  }}
                  aria-hidden
                />
              ))}
            </div>

            <div className="mb-3 flex items-center justify-center gap-3">
              <span className="h-px w-8 bg-border" />
              <span className="mono-tag text-ember">FORGE COOLING</span>
              <span className="h-px w-8 bg-border" />
            </div>
            <h2
              className="display-host text-[38px] leading-tight tracking-tight mb-3"
            >
              Stoking the <span className="text-ember italic">fire</span>
            </h2>
            <p className="text-[14px] leading-relaxed text-muted-foreground max-w-sm mx-auto mb-6">
              Select a persona from the rail to begin a conversation. The
              anvil's still warm — your characters are waiting.
            </p>

            <div className="inline-flex items-center gap-3 text-[11px] text-muted-foreground/55">
              <span className="dot-hot" aria-hidden>
                <span />
                <span />
                <span />
              </span>
              <span className="mono-tag">{`await · heat input`}</span>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 mono-tag text-muted-foreground/35">
              <kbd className="px-2 py-1 border border-border rounded-sm">ESC</kbd>
              <span>to dismiss chat</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
