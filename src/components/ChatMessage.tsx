import type { ChatMessage as ChatMessageType } from '@/shared/types/chat';
import { cn } from '@/lib/utils';
import { substituteMacros } from '@/lib/macros';
import { renderMarkdown } from '@/lib/markdown';

interface ChatMessageProps {
  msg: ChatMessageType;
  index?: number;
  characterAvatar?: string;
  userName?: string;
  characterName?: string;
}

export function ChatMessage({
  msg,
  index = 0,
  characterAvatar,
  userName = 'User',
  characterName = 'Character',
}: ChatMessageProps) {
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

  const processedText = substituteMacros(msg.mes, { userName, characterName });
  const renderedContent = renderMarkdown(processedText);

  return (
    <div className="group relative flex flex-col">
      {/* Header bar — full width */}
      <div
        className={cn(
          'flex items-center gap-2 border-b px-3 py-1.5',
          isUser
            ? 'border-ember/20 bg-ember/5'
            : 'border-border bg-muted/20',
        )}
      >
        {/* Avatar */}
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

        {/* Name + timestamp + role tag */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            className={cn(
              'display-host truncate text-[13px] font-medium',
              isUser ? 'text-ember/90' : 'text-foreground/80',
            )}
          >
            {msg.name}
          </span>
          <span className="mono-tag text-muted-foreground/40 tabular-nums">{ts}</span>
          <span
            className={cn(
              'mono-tag tabular-nums',
              isUser ? 'text-ember/50' : 'text-muted-foreground/45',
            )}
          >
            {String(index + 1).padStart(3, '0')}
          </span>
          <span
            className={cn(
              'mono-tag',
              isUser ? 'text-ember/40' : 'text-muted-foreground/35',
            )}
          >
            {isUser ? 'YOU' : 'AI'}
          </span>
        </div>
      </div>

      {/* Message body — mes_text class for ST styling */}
      <div
        className={cn(
          'mes_text relative px-4 py-3 text-[13.5px] leading-relaxed break-words',
          isUser
            ? 'bg-ember/5 text-foreground'
            : 'bg-transparent text-foreground/90',
        )}
      >
        {renderedContent}
      </div>
    </div>
  );
}
