import { cn } from "@/lib/utils";

interface OnlineStatusProps {
  connected: boolean;
  text?: string;
  className?: string;
}

/**
 * Reusable connection status indicator.
 *
 * Mirrors the SillyTavern `.online_status` block: a small dot followed by
 * a status string. Green dot when connected, gray when not.
 */
export function OnlineStatus({ connected, text, className }: OnlineStatusProps) {
  const label = text ?? (connected ? "Connected" : "No connection...");
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
        "bg-muted/30 border border-border/60",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span
        aria-hidden
        className={cn(
          "inline-block h-2.5 w-2.5 rounded-full shrink-0 transition-colors",
          connected
            ? "bg-emerald-500 shadow-[0_0_8px_-1px_color-mix(in_oklch,var(--ember)_60%,transparent)]"
            : "bg-muted-foreground/40",
        )}
      />
      <span
        className={cn(
          "mono-tag text-[12px] tracking-tight",
          connected ? "text-foreground/80" : "text-muted-foreground/60",
        )}
      >
        {label}
      </span>
    </div>
  );
}
