import type { ChatMessage as ChatMessageType } from '@/shared/types/chat';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  msg: ChatMessageType;
  index?: number;
  characterAvatar?: string;
}

export function ChatMessage({ msg, index = 0, characterAvatar }: ChatMessageProps) {
  const isUser = msg.is_user;

  let ts: string;
  try {
    const raw = msg.send_date ?? '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) throw new Error('bad');
    ts = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    ts = '--:--';
  }

  const initial = msg.name && msg.name.length > 0 ? msg.name[0]!.toUpperCase() : '?';

  return (
    <div className={cn('group relative flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border',
          isUser ? 'border-ember/40 bg-ember/10' : 'border-border bg-muted/40',
        )}
      >
        {isUser ? (
          <span className="display-host text-ember text-[13px] font-semibold">{initial}</span>
        ) : characterAvatar ? (
          <img
            src={characterAvatar}
            alt={msg.name}
            className="h-8 w-8 rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span className="display-host text-foreground/70 text-[13px] italic">{initial}</span>
        )}
      </div>

      <div
        className={cn('flex max-w-[78%] min-w-0 flex-col', isUser ? 'items-end' : 'items-start')}
      >
        <div
          className={cn(
            'mb-1 flex items-center gap-2 px-0.5',
            isUser ? 'flex-row-reverse' : 'flex-row',
          )}
        >
          <span className="mono-tag text-muted-foreground/50 tabular-nums">
            {String(index + 1).padStart(3, '0')}
          </span>
          <span
            className={cn(
              'truncate text-[12px] font-medium tracking-tight',
              isUser ? 'text-ember/90' : 'text-foreground/80',
            )}
            style={{
              fontFamily: 'var(--font-display)',
            }}
          >
            {msg.name}
          </span>
          <span className="mono-tag text-muted-foreground/40 tabular-nums">{ts}</span>
        </div>

        <div
          className={cn(
            'relative rounded-sm px-3.5 py-2.5 text-[13.5px] leading-relaxed break-words whitespace-pre-wrap',
            isUser
              ? 'bg-ember/15 border-ember/30 text-foreground border'
              : 'bg-card border-border text-foreground/90 border shadow-[inset_0_1px_0_0_color-mix(in_oklch,var(--foreground)_6%,transparent)]',
          )}
        >
          {isUser && (
            <span aria-hidden className="bg-ember absolute top-0 bottom-0 -left-px w-px" />
          )}
          {msg.mes}
        </div>
      </div>
    </div>
  );
}
