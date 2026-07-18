import { useEffect } from 'react';
import { useChatStore } from '@/lib/stores';
import { ChatView } from '@/components/ChatView';

export function ChatsPanel() {
  const { activeCharacterId, setActiveCharacter } = useChatStore();

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeCharacterId) {
        setActiveCharacter(null);
      }
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [activeCharacterId, setActiveCharacter]);

  return (
    <div data-panel="chats" className="bg-background flex h-full w-full flex-1 overflow-hidden">
      {/* Main chat area — the CharacterSelector now lives in the right drawer */}
      {activeCharacterId != null ? (
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <ChatView characterId={activeCharacterId} />
        </section>
      ) : (
        <section className="relative flex min-w-0 flex-1 items-center justify-center">
          {/* Ambience */}
          <div aria-hidden className="ambient-glow pointer-events-none absolute inset-0" />

          <div className="relative max-w-md px-6 text-center">
            {/* Heat indicator */}
            <div className="relative mx-auto mb-6 h-24 w-24">
              <div
                className="border-ember/30 absolute inset-0 rounded-full border"
                style={{
                  background:
                    'radial-gradient(circle at 50% 60%, color-mix(in oklch, var(--ember) 35%, transparent) 0%, transparent 70%)',
                }}
              />
              {/* concentric rivets */}
              <div
                className="border-border/60 absolute inset-2.5 flex items-center justify-center rounded-full border"
                style={{
                  animation: 'ember-pulse 3s ease-in-out infinite',
                }}
              >
                <span
                  className="display-host text-ember inline-block -translate-x-[3px] text-[48px] leading-[0.8] italic"
                  aria-hidden
                >
                  ⌑
                </span>
              </div>
              {/* outer registration ticks */}
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="bg-ember/40 absolute top-1/2 left-1/2 h-px w-2"
                  style={{
                    transform: [
                      'translate(-50%, -50%) rotate(0deg) translateX(42px)',
                      'translate(-50%, -50%) rotate(90deg) translateX(42px)',
                      'translate(-50%, -50%) rotate(180deg) translateX(42px)',
                      'translate(-50%, -50%) rotate(270deg) translateX(42px)',
                    ][i],
                  }}
                  aria-hidden
                />
              ))}
            </div>

            <div className="mb-2 flex items-center justify-center gap-2.5">
              <span className="bg-border h-px w-7" />
              <span className="mono-tag text-ember">FORGE COOLING</span>
              <span className="bg-border h-px w-7" />
            </div>
            <h2 className="display-host mb-2 text-[30px] leading-tight tracking-tight">
              Stoking the <span className="text-ember italic">fire</span>
            </h2>
            <p className="text-muted-foreground mx-auto mb-5 max-w-sm text-[13px] leading-relaxed">
              Select a persona from the right rail to begin a conversation. The anvil's still warm —
              your characters are waiting.
            </p>

            <div className="text-muted-foreground/55 inline-flex items-center gap-2.5 text-[10px]">
              <span className="dot-hot" aria-hidden>
                <span />
                <span />
                <span />
              </span>
              <span className="mono-tag">{`await · heat input`}</span>
            </div>

            <div className="mono-tag text-muted-foreground/35 mt-6 flex items-center justify-center gap-2">
              <kbd className="border-border rounded-sm border px-1.5 py-0.5">ESC</kbd>
              <span>to dismiss chat</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
