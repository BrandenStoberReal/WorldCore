import type { ChatMessage as ChatMessageType } from "@/shared/types/chat";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  msg: ChatMessageType;
  index?: number;
  characterAvatar?: string;
}

export function ChatMessage({ msg, index = 0, characterAvatar }: ChatMessageProps) {
  const isUser = msg.is_user;

  let ts: string;
  try {
    const raw = msg.send_date ?? "";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) throw new Error("bad");
    ts = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    ts = "--:--";
  }

  const initial =
    msg.name && msg.name.length > 0 ? msg.name[0]!.toUpperCase() : "?";

  return (
    <div
      className={cn(
        "group relative flex gap-3",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "shrink-0 h-8 w-8 rounded-full overflow-hidden border flex items-center justify-center",
          isUser
            ? "border-ember/40 bg-ember/10"
            : "border-border bg-muted/40",
        )}
      >
        {isUser ? (
          <span className="display-host text-ember text-[13px] font-semibold">
            {initial}
          </span>
        ) : characterAvatar ? (
          <img
            src={characterAvatar}
            alt={msg.name}
            className="h-8 w-8 rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="display-host text-foreground/70 text-[13px] italic">
            {initial}
          </span>
        )}
      </div>

      <div className={cn("max-w-[78%] min-w-0 flex flex-col", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "flex items-center gap-2 mb-1 px-0.5",
            isUser ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span className="mono-tag text-muted-foreground/50 tabular-nums">
            {String(index + 1).padStart(3, "0")}
          </span>
          <span
            className={cn(
              "text-[12px] font-medium tracking-tight truncate",
              isUser ? "text-ember/90" : "text-foreground/80",
            )}
            style={{
              fontFamily: "var(--font-display)",
              fontVariationSettings: "'opsz' 14, 'SOFT' 30",
            }}
          >
            {msg.name}
          </span>
          <span className="mono-tag text-muted-foreground/40 tabular-nums">
            {ts}
          </span>
        </div>

        <div
          className={cn(
            "relative rounded-sm px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap break-words",
            isUser
              ? "bg-ember/15 border border-ember/30 text-foreground"
              : "bg-card border border-border text-foreground/90 shadow-[inset_0_1px_0_0_color-mix(in_oklch,var(--foreground)_6%,transparent)]",
          )}
        >
          {isUser && (
            <span
              aria-hidden
              className="absolute -left-px top-0 bottom-0 w-px bg-ember"
            />
          )}
          {msg.mes}
        </div>
      </div>
    </div>
  );
}

