import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Square } from 'lucide-react';
import { cn, surfaceCard } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  disabled: boolean;
  isGenerating: boolean;
}

export function ChatInput({ onSend, onStop, disabled, isGenerating }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className="border-border/60 bg-background/60 supports-[backdrop-filter]:bg-background/40 shrink-0 border-t p-3 backdrop-blur-sm md:p-4">
      <div className="relative mx-auto max-w-3xl">
        {/* Stoker frame — outer ring with ember hairline */}
        <div
          className={cn(
            surfaceCard,
            'focus-within:border-ember/60 relative rounded-md transition-colors',
          )}
        >
          <div
            aria-hidden
            className="via-ember/60 pointer-events-none absolute -top-px right-6 left-6 h-px bg-gradient-to-r from-transparent to-transparent opacity-0 transition-opacity focus-within:opacity-100"
          />
          <div className="flex items-end gap-2 px-3 pt-3 pb-3">
            <div className="flex shrink-0 flex-col justify-between gap-1">
              <span className="mono-tag text-ember/70">{`>`}</span>
              <span className="mono-tag text-muted-foreground/40">STOKE</span>
            </div>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isGenerating ? 'generating...' : 'type a message...'}
              rows={1}
              className="placeholder:text-muted-foreground/50 flex max-h-40 min-h-9 flex-1 resize-none bg-transparent font-mono text-[13.5px] leading-relaxed outline-none disabled:opacity-50"
              disabled={disabled && !isGenerating}
            />
          </div>
        </div>

        {/* Action rail */}
        <div className="mt-2 flex items-center justify-between">
          <div className="mono-tag text-muted-foreground/40 flex items-center gap-3">
            <span>{`{ esc }`} dismiss</span>
            <span>{`{ ⇧ + ⏎ }`} newline</span>
            <span>{`{ ⏎ }`} transmit</span>
          </div>

          {isGenerating ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onStop}
              className="hover:border-destructive/60 hover:text-destructive h-7 gap-1.5 transition-transform hover:scale-105"
              title="Stop generation"
            >
              <Square className="h-3 w-3 fill-current" />
              <span className="mono-tag">ABORT</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!value.trim() || disabled}
              className="h-7 gap-1.5 transition-transform hover:scale-105"
              title="Send message"
            >
              <Send className="h-3 w-3" />
              <span className="mono-tag font-bold">TRANSMIT</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
