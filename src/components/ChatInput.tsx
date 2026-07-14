import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, Square } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  disabled: boolean;
  isGenerating: boolean;
}

export function ChatInput({ onSend, onStop, disabled, isGenerating }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 160) + "px";
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-border bg-background/60 backdrop-blur-sm p-3 md:p-4 shrink-0">
      <div className="relative max-w-3xl mx-auto">
        {/* Stoker frame — outer ring with ember hairline */}
        <div className="relative rounded-sm border border-border bg-card/60 focus-within:border-ember/60 transition-colors shadow-[inset_0_1px_0_0_color-mix(in_oklch,var(--foreground)_5%,transparent)]">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-ember/60 to-transparent opacity-0 focus-within:opacity-100 transition-opacity"
          />
          <div className="flex items-end gap-2 px-3 pt-3 pb-3">
            <div className="flex flex-col gap-1 justify-between shrink-0">
              <span className="mono-tag text-ember/70">{`>`}</span>
              <span className="mono-tag text-muted-foreground/40">STOKE</span>
            </div>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isGenerating ? "hamering in progress..." : "transmit text to the forge..."}
              rows={1}
              className="flex min-h-9 max-h-40 flex-1 resize-none bg-transparent text-[13.5px] leading-relaxed outline-none font-mono placeholder:text-muted-foreground/50 disabled:opacity-50"
              disabled={disabled && !isGenerating}
            />
          </div>
        </div>

        {/* Action rail */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-3 mono-tag text-muted-foreground/40">
            <span>{`{ esc }`} dismiss</span>
            <span>{`{ ⇧ + ⏎ }`} newline</span>
            <span>{`{ ⏎ }`} transmit</span>
          </div>

          {isGenerating ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onStop}
              className="h-7 gap-1.5 hover:border-destructive/60 hover:text-destructive"
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
              className="h-7 gap-1.5"
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
