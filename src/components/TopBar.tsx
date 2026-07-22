import { useAppStore } from '@/lib/stores';
import { cn } from '@/lib/utils';

function LogoMark() {
  return (
    <div
      className="bg-muted/60 border-border relative flex h-8 w-8 items-center justify-center rounded-md border"
      aria-hidden
    >
      <span className="display-host text-foreground text-[14px] leading-none">
        <span className="text-ember">互联</span>
      </span>
    </div>
  );
}

export function TopBar() {
  const { user, theme, setTheme } = useAppStore();

  const themeNext: 'light' | 'dark' | 'system' = theme === 'dark' ? 'light' : 'dark';

  return (
    <header className="top-bar flex items-center justify-between px-4" role="banner">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <a href="/" className="group flex items-center gap-2" aria-label="WorldCore home">
            <LogoMark />
            <span className="display-host hidden text-[17px] sm:inline">
              World<span className="text-ember">Core</span>
            </span>
          </a>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTheme(themeNext)}
          className={cn(
            'flex h-8 items-center justify-center rounded-md px-2.5',
            'border-border bg-background/60 hover:bg-accent/40 border transition-colors',
          )}
          aria-label={`Switch to ${themeNext} theme`}
          title={`Theme: ${theme}`}
        >
          <ThemeGlyph theme={theme} />
        </button>

        <div className="border-border/60 flex items-center gap-2 border-l pl-2">
          <div className="bg-muted/60 border-border flex h-7 w-7 items-center justify-center rounded-md border">
            <span className="display-host text-foreground/80 text-[13px]">
              {user ? (user.name[0]?.toUpperCase() ?? 'G') : 'G'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function ThemeGlyph({ theme }: { theme: 'light' | 'dark' | 'system' }) {
  const isDark = theme === 'dark' || theme === 'system';
  return (
    <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center">
      <span
        className={cn(
          'absolute inset-0 rounded-full transition-opacity',
          isDark ? 'opacity-0' : 'bg-ember opacity-100',
        )}
      />
      <span
        className={cn(
          'bg-foreground absolute inset-0 rounded-full transition-opacity',
          isDark ? 'opacity-80' : 'opacity-15',
        )}
      />
      <span
        className={cn(
          'bg-background absolute h-2 w-2 rounded-full transition-all',
          isDark ? 'translate-x-1.5 -translate-y-0' : 'translate-x-[-2px]',
        )}
        style={{ boxShadow: '0 0 0 1px var(--border)' }}
      />
    </span>
  );
}
