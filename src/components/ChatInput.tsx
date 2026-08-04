import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { cn, surfaceCard, ambientGlow } from '@/lib/utils';
import { apiPost } from '@/lib/api';
import { ExtensionSlot } from '@/lib/extensionSlots';
import { useScrollInputIntoView } from '@/hooks/useVirtualKeyboard';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  disabled: boolean;
  isGenerating: boolean;
}

const TOKEN_DEBOUNCE_MS = 400;

export function ChatInput({ onSend, onStop, disabled, isGenerating }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useScrollInputIntoView(textareaRef);

  const fetchTokenCount = useCallback(async (text: string) => {
    if (!text.trim()) {
      setTokenCount(null);
      setTokenLoading(false);
      return;
    }
    setTokenLoading(true);
    try {
      const res = await apiPost<{ count: number }>('/tokenizers/count', {
        model: 'cl100k_base',
        text,
      });
      setTokenCount(res.count);
    } catch {
      setTokenCount(Math.ceil(text.length / 4));
    } finally {
      setTokenLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setTokenCount(null);
      setTokenLoading(false);
      return;
    }
    setTokenLoading(true);
    debounceRef.current = setTimeout(() => {
      void fetchTokenCount(value);
    }, TOKEN_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchTokenCount]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    setTokenCount(null);
    setTokenLoading(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSendClick = () => {
    if (isGenerating) {
      onStop();
    } else {
      handleSubmit();
    }
  };

  const canSend = value.trim() && !disabled && !isGenerating;

  return (
    <div className="border-border/60 bg-background/60 supports-[backdrop-filter]:bg-background/40 safe-area-bottom shrink-0 border-t p-1 backdrop-blur-sm sm:p-4">
      <div className="relative mx-auto max-w-6xl">
        <div
          className={cn(
            surfaceCard,
            'focus-within:border-ember/60 relative rounded-md transition-colors',
          )}
        >
          <div
            aria-hidden
            className="via-ember/60 pointer-events-none absolute -top-px right-6 left-6 hidden h-px bg-gradient-to-r from-transparent to-transparent opacity-0 transition-opacity focus-within:opacity-100 sm:block"
          />
          <div className="relative flex items-center gap-1 px-1.5 py-0.5 sm:gap-2 sm:px-3 sm:py-3">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={
                isGenerating ? 'generating...' : 'type a message... (⏎ send, ⇧⏎ newline)'
              }
              rows={1}
              className="placeholder:text-muted-foreground/50 flex max-h-40 min-h-5 flex-1 resize-none bg-transparent font-mono text-[11px] leading-tight outline-none disabled:opacity-50 sm:min-h-9 sm:text-[13.5px] sm:leading-relaxed"
              disabled={disabled && !isGenerating}
            />
            <div className="mono-tag text-muted-foreground/60 hidden shrink-0 text-xs tabular-nums sm:block sm:text-sm">
              {tokenLoading ? (
                <span className="inline-block animate-pulse">...</span>
              ) : tokenCount !== null ? (
                <span>{tokenCount}</span>
              ) : null}
            </div>
            <Button
              size="icon-sm"
              onClick={handleSendClick}
              disabled={!canSend && !isGenerating}
              className={cn(
                'shrink-0 self-end transition-all duration-200',
                isGenerating && 'border-ember/50 text-ember hover:border-ember/70 hover:text-ember',
                !isGenerating && ambientGlow,
              )}
              title={isGenerating ? 'Stop generation' : 'Send message'}
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        <ExtensionSlot slotId="chat-input-toolbar" />
      </div>
    </div>
  );
}
