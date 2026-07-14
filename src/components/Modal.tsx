import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={handleOverlayClick}
      style={{
        background:
          "radial-gradient(circle at 78% 18%, color-mix(in oklch, var(--ember) 12%, transparent) 0%, transparent 50%), color-mix(in oklch, var(--background) 82%, transparent)",
      }}
    >
      <div
        className={cn(
          "relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-sm",
          "border border-border bg-card text-card-foreground",
          "shadow-[0_24px_70px_-12px_color-mix(in_oklch,var(--ember)_45%,transparent)]",
          "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-ember before:to-transparent",
          className,
        )}
      >
        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-border px-5 py-4 sticky top-0 bg-card z-10">
          {title ? (
            <h2
              className="display-host text-[20px] leading-none tracking-tight"
            >
              {title}
            </h2>
          ) : (
            <span className="mono-tag text-ember">{`> sheet`}</span>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="text-muted-foreground hover:text-ember"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">{children}</div>

        {/* Bottom rivet rail */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-border/60 bg-background/40">
          <span className="mono-tag text-muted-foreground/40">{`{ sheet }`}</span>
          <span className="mono-tag text-ember/40">⌑</span>
        </div>
      </div>
    </div>
  );
}
