import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';
import { cn, surfaceCard, ambientGlow } from '@/lib/utils';
import { useScrollInputIntoView } from '@/hooks/useVirtualKeyboard';

interface MobileChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  disabled: boolean;
  isGenerating: boolean;
}

export function MobileChatInput({ onSend, onStop, disabled, isGenerating }: MobileChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useScrollInputIntoView(textareaRef);

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

  const handleSendClick = () => {
    if (isGenerating) {
      onStop();
    } else {
      handleSubmit();
    }
  };

  const canSend = value.trim() && !disabled && !isGenerating;

  return (
    <div className="border-border/60 bg-background/60 supports-[backdrop-filter]:bg-background/40 safe-area-bottom shrink-0 border-t px-1 py-0.5 backdrop-blur-sm">
      <div className="relative mx-auto max-w-6xl">
        <div
          className={cn(
            surfaceCard,
            'focus-within:border-ember/60 relative rounded-md transition-colors',
          )}
        >
          <div className="relative flex items-center gap-1 px-1.5 py-0.5">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isGenerating ? 'generating...' : 'message...'}
              rows={1}
              className="placeholder:text-muted-foreground/50 flex max-h-40 min-h-5 flex-1 resize-none bg-transparent font-mono text-[11px] leading-tight outline-none disabled:opacity-50"
              disabled={disabled && !isGenerating}
            />
            <Button
              size="icon-sm"
              onClick={handleSendClick}
              disabled={!canSend && !isGenerating}
              className={cn(
                'h-6 w-6 shrink-0 self-end p-0 transition-all duration-200',
                isGenerating && 'border-ember/50 text-ember hover:border-ember/70 hover:text-ember',
                !isGenerating && ambientGlow,
              )}
              title={isGenerating ? 'Stop generation' : 'Send message'}
            >
              {isGenerating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
