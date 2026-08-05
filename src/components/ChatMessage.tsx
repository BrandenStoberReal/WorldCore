import { useState, useEffect, useMemo, memo, useRef } from 'react';
import type { ChatMessage as ChatMessageType } from '@/shared/types/chat';
import { cn, estimateTokens } from '@/lib/utils';
import { substituteMacros, type MacroContext } from '@/lib/macros';
import { renderMarkdown } from '@/lib/markdown';
import { ChevronDown, ChevronLeft, ChevronRight, Copy, Pencil, RotateCcw, Check, Trash2 } from 'lucide-react';

function formatThinkingDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  return `${m}m ${rem.toFixed(0)}s`;
}

interface ChatMessageProps {
  msg: ChatMessageType;
  index?: number;
  characterAvatar?: string;
  userAvatar?: string;
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
  onDelete?: (index: number) => void;
  canDelete?: boolean;
  autoExpandThinking?: boolean;
  showHidden?: boolean;
  isStreaming?: boolean;
  thinkingDuration?: number;
  alternateGreetings?: string[];
  activeGreetingIndex?: number;
  onGreetingChange?: (index: number) => void;
}

export const ChatMessage = memo(function ChatMessage({
  msg,
  index = 0,
  characterAvatar,
  userAvatar,
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
  onDelete,
  canDelete = true,
  autoExpandThinking = false,
  showHidden = true,
  isStreaming = false,
  thinkingDuration,
  alternateGreetings = [],
  activeGreetingIndex = 0,
  onGreetingChange,
}: ChatMessageProps) {
  const isUser = msg.is_user;
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg.mes);
  const [thinkingOpen, setThinkingOpen] = useState(autoExpandThinking);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const wasStreamingRef = useRef(false);
  const thinkingStartRef = useRef<number | null>(null);
  const [liveThinkingElapsed, setLiveThinkingElapsed] = useState<number | null>(null);
  const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isStreaming) {
      wasStreamingRef.current = true;
      setThinkingOpen(true);
    } else if (wasStreamingRef.current) {
      wasStreamingRef.current = false;
      if (thinkingTimerRef.current) {
        clearInterval(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
      }
      if (thinkingStartRef.current !== null) {
        setLiveThinkingElapsed(Date.now() - thinkingStartRef.current);
      }
      thinkingStartRef.current = null;
    }
  }, [isStreaming]);

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

  const macroContext = useMemo(
    () => ({
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
    }),
    [
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
    ],
  ) satisfies MacroContext;

  const processedText = useMemo(
    () => substituteMacros(msg.mes, macroContext),
    [msg.mes, macroContext],
  );
  const renderedContent = useMemo(
    () => renderMarkdown(processedText, { highlightOpeningTags: true }),
    [processedText],
  );

  const thinkingContent =
    !isUser && typeof msg.thinking === 'string' && msg.thinking.length > 0 ? msg.thinking : null;

  useEffect(() => {
    if (isStreaming && thinkingContent && !thinkingTimerRef.current) {
      thinkingStartRef.current = Date.now();
      setLiveThinkingElapsed(0);
      thinkingTimerRef.current = setInterval(() => {
        setLiveThinkingElapsed(Date.now() - thinkingStartRef.current!);
      }, 200);
    }
  }, [isStreaming, thinkingContent]);

  const renderedThinking = useMemo(
    () =>
      thinkingContent
        ? renderMarkdown(substituteMacros(thinkingContent, macroContext), {
            highlightOpeningTags: true,
          })
        : null,
    [thinkingContent, macroContext],
  );

  const thinkingTokenCount = useMemo(
    () => (thinkingContent ? estimateTokens(thinkingContent) : 0),
    [thinkingContent],
  );

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
              userAvatar ? (
                <img
                  src={userAvatar}
                  alt={msg.name}
                  className="h-6 w-6 rounded-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="display-host text-ember text-[11px] font-semibold">{initial}</span>
              )
            ) : characterAvatar ? (
              <img
                src={characterAvatar}
                alt={msg.name}
                className="h-6 w-6 rounded-full object-cover"
                loading="lazy"
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

      {/* Thinking aside — inline drawer above message body */}
      {renderedThinking && showHidden && (
        <details
          open={thinkingOpen}
          onToggle={(e) => setThinkingOpen(e.currentTarget.open)}
          className="group/thinking border-border/40 bg-muted/20 mx-3 mt-1 mb-0.5 rounded-md border text-[12px]"
        >
          <summary className="text-muted-foreground/70 hover:text-muted-foreground flex cursor-pointer items-center gap-1.5 px-3 py-1.5 transition-colors select-none">
            {isStreaming ? (
              <span className="mono-tag flex items-center gap-1.5">
                <span className="dot-hot" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
                Thinking…
              </span>
            ) : (
              <span className="mono-tag">Thoughts</span>
            )}
            {thinkingContent && (
              <span className="mono-tag text-muted-foreground/40 ml-1.5">
                {thinkingTokenCount} tok
                {isStreaming && liveThinkingElapsed != null
                  ? ` · ${formatThinkingDuration(liveThinkingElapsed)}`
                  : !isStreaming && thinkingDuration != null && thinkingDuration > 0
                    ? ` · ${formatThinkingDuration(thinkingDuration)}`
                    : ''}
              </span>
            )}
            <span className="ml-auto opacity-0 transition-all group-open/thinking:rotate-180 group-hover/thinking:opacity-100">
              <ChevronDown className="h-2.5 w-2.5" />
            </span>
          </summary>
          <div className="mes_text border-border/30 text-foreground/70 border-t px-3 py-2">
            {renderedThinking}
          </div>
        </details>
      )}

      {/* Message body — mes_text class for ST styling */}
      <div
        className="group/message relative"
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
        onClick={() => setContextMenu(null)}
      >
        <div
          className={cn(
            'mes_text relative rounded-md px-3 py-2 text-xs leading-relaxed break-words sm:px-4 sm:py-3 sm:text-sm',
            isUser ? 'bg-ember/5 shadow-sm' : 'bg-card/40 text-foreground shadow-xs',
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

        {/* Greeting navigation arrows — first character message only */}
        {index === 0 && !isUser && alternateGreetings.length > 0 && onGreetingChange && (
          <div className="mt-1 flex items-center gap-1">
            <button
              type="button"
              onClick={() => onGreetingChange(Math.max(0, activeGreetingIndex - 1))}
              disabled={activeGreetingIndex === 0}
              className="text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              title="Previous greeting"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="mono-tag text-muted-foreground/50 text-[10px]">
              {activeGreetingIndex === 0 ? 'Default' : `Greeting ${activeGreetingIndex + 1}`}
              {' '}/{' '}{alternateGreetings.length + 1}
            </span>
            <button
              type="button"
              onClick={() => onGreetingChange(Math.min(alternateGreetings.length, activeGreetingIndex + 1))}
              disabled={activeGreetingIndex >= alternateGreetings.length}
              className="text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              title="Next greeting"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Desktop: hover action buttons */}
        <div className="message-actions absolute -top-3 right-2 hidden items-center gap-0.5 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover/message:opacity-100 sm:flex">
          <button
            type="button"
            onClick={() => {
              onCopy?.(msg.mes);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="bg-background/80 hover:bg-accent/50 border-border/60 flex h-8 w-8 items-center justify-center rounded border p-0 transition-colors"
            title="Copy message"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          {onEdit && (
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
              className="bg-background/80 hover:bg-accent/50 border-border/60 flex h-8 w-8 items-center justify-center rounded border p-0 transition-colors"
              title={isEditing ? 'Save edit' : 'Edit message'}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}

          {!isUser && onRegenerate && (
            <button
              type="button"
              onClick={() => onRegenerate(index)}
              className="bg-background/80 hover:bg-accent/50 border-border/60 flex h-8 w-8 items-center justify-center rounded border p-0 transition-colors"
              title="Regenerate response"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}

          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(index)}
              className="bg-background/80 hover:bg-destructive/10 hover:text-destructive border-border/60 flex h-8 w-8 items-center justify-center rounded border p-0 transition-colors"
              title="Delete message"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Mobile: long-press context menu */}
        {contextMenu && (
          <div
            className="bg-background/95 border-border/60 fixed z-50 flex animate-in fade-in zoom-in-95 duration-150 flex-col gap-0.5 rounded-lg border p-1 shadow-lg backdrop-blur-md sm:hidden"
            style={{ left: Math.min(contextMenu.x, window.innerWidth - 180), top: Math.min(contextMenu.y, window.innerHeight - 160) }}
          >
            <button
              type="button"
              onClick={() => {
                onCopy?.(msg.mes);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
                setContextMenu(null);
              }}
              className="hover:bg-accent/50 flex items-center gap-2 rounded-md px-3 py-2 text-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    onEdit(index, editText);
                    setIsEditing(false);
                  } else {
                    setIsEditing(true);
                  }
                  setContextMenu(null);
                }}
                className="hover:bg-accent/50 flex items-center gap-2 rounded-md px-3 py-2 text-xs"
              >
                <Pencil className="h-3.5 w-3.5" />
                {isEditing ? 'Save' : 'Edit'}
              </button>
            )}

            {!isUser && onRegenerate && (
              <button
                type="button"
                onClick={() => {
                  onRegenerate(index);
                  setContextMenu(null);
                }}
                className="hover:bg-accent/50 flex items-center gap-2 rounded-md px-3 py-2 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Regenerate
              </button>
            )}

            {canDelete && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(index);
                  setContextMenu(null);
                }}
                className="hover:bg-destructive/10 hover:text-destructive flex items-center gap-2 rounded-md px-3 py-2 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
