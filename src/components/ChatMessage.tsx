import { useState } from 'react';
import type { ChatMessage as ChatMessageType } from '@/shared/types/chat';
import { cn } from '@/lib/utils';
import { substituteMacros, type MacroContext } from '@/lib/macros';
import { renderMarkdown } from '@/lib/markdown';
import { Copy, Pencil, RotateCcw, Check } from 'lucide-react';

interface ChatMessageProps {
  msg: ChatMessageType;
  index?: number;
  characterAvatar?: string;
  userName?: string;
  characterName?: string;
  description?: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
  creator_notes?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  onCopy?: (text: string) => void;
  onEdit?: (index: number, newText: string) => void;
  onRegenerate?: (index: number) => void;
}

export function ChatMessage({
  msg,
  index = 0,
  characterAvatar,
  userName = 'User',
  characterName = 'Character',
  description,
  personality,
  scenario,
  first_mes,
  mes_example,
  creator_notes,
  system_prompt,
  post_history_instructions,
  onCopy,
  onEdit,
  onRegenerate,
}: ChatMessageProps) {
  const isUser = msg.is_user;
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg.mes);

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

  const processedText = substituteMacros(msg.mes, {
    userName,
    characterName,
    description,
    personality,
    scenario,
    first_mes,
    mes_example,
    creator_notes,
    system_prompt,
    post_history_instructions,
  });
  const renderedContent = renderMarkdown(processedText);

  return (
    <div className="group relative flex flex-col">
      {/* Compact header — avatar + name on first line, metadata on second */}
      <div className="flex flex-col gap-0.5 px-3 pt-2 pb-1">
        {/* Name row */}
        <div className="flex items-center gap-1.5">
          {/* Avatar — compact 6×6 */}
          <div
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border',
              isUser ? 'border-ember/40 bg-ember/10' : 'border-border bg-muted/40',
            )}
          >
            {isUser ? (
              <span className="display-host text-ember text-[11px] font-semibold">{initial}</span>
            ) : characterAvatar ? (
              <img
                src={characterAvatar}
                alt={msg.name}
                className="h-6 w-6 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="display-host text-foreground/70 text-[11px] italic">{initial}</span>
            )}
          </div>

          <span
            className={cn(
              'display-host truncate text-[13px] font-medium',
              isUser ? 'text-ember/90' : 'text-foreground/80',
            )}
          >
            {msg.name}
          </span>
        </div>

        {/* Metadata row — timestamp, index, role */}
        <div className="flex items-center gap-2 pl-[30px]">
          <span className="mono-tag text-muted-foreground/50 tabular-nums">{ts}</span>
          <span
            className={cn(
              'mono-tag text-muted-foreground/50 tabular-nums',
              isUser && 'text-ember/50',
            )}
          >
            {String(index + 1).padStart(3, '0')}
          </span>
          <span className={cn('mono-tag text-muted-foreground/50', isUser && 'text-ember/40')}>
            {isUser ? 'YOU' : 'AI'}
          </span>
        </div>
      </div>

      {/* Message body — mes_text class for ST styling */}
      <div className="group/message relative">
        <div
          className={cn(
            'mes_text relative rounded-md px-4 py-3 text-[13.5px] leading-relaxed break-words',
            isUser ? 'bg-ember/5 shadow-sm' : 'bg-card/40 text-foreground/90 shadow-xs',
          )}
        >
          {isEditing ? (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full resize-none bg-transparent outline-none"
              rows={Math.min(editText.split('\n').length, 10)}
              autoFocus
            />
          ) : (
            renderedContent
          )}
        </div>

        {/* Action buttons — appear on hover */}
        <div className="absolute -top-2 right-2 flex items-center gap-1 opacity-0 transition-opacity group-hover/message:opacity-100">
          <button
            type="button"
            onClick={() => {
              onCopy?.(msg.mes);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="bg-background/80 hover:bg-accent/50 border-border/60 flex h-6 items-center gap-1 rounded-md border px-1.5 text-[10px] backdrop-blur-sm transition-colors"
            title="Copy message"
          >
            {copied ? (
              <Check className="h-2.5 w-2.5 text-emerald-500" />
            ) : (
              <Copy className="h-2.5 w-2.5" />
            )}
            <span className="mono-tag">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {isUser && onEdit && (
            <button
              type="button"
              onClick={() => {
                if (isEditing) {
                  onEdit(index, editText);
                  setIsEditing(false);
                } else {
                  setIsEditing(true);
                }
              }}
              className="bg-background/80 hover:bg-accent/50 border-border/60 flex h-6 items-center gap-1 rounded-md border px-1.5 text-[10px] backdrop-blur-sm transition-colors"
              title={isEditing ? 'Save edit' : 'Edit message'}
            >
              <Pencil className="h-2.5 w-2.5" />
              <span className="mono-tag">{isEditing ? 'Save' : 'Edit'}</span>
            </button>
          )}

          {!isUser && onRegenerate && (
            <button
              type="button"
              onClick={() => onRegenerate(index)}
              className="bg-background/80 hover:bg-accent/50 border-border/60 flex h-6 items-center gap-1 rounded-md border px-1.5 text-[10px] backdrop-blur-sm transition-colors"
              title="Regenerate response"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              <span className="mono-tag">Regen</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
