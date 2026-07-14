import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "destructive",
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-md">
      <div className="flex items-start gap-3 mb-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-sm border border-destructive/40 bg-destructive/10 text-destructive shrink-0">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <p className="text-[13.5px] leading-relaxed text-muted-foreground pt-1.5">
          {message}
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-border/60">
        <Button variant="outline" onClick={onClose}>
          <span className="mono-tag">cancel</span>
        </Button>
        <Button
          variant={variant}
          onClick={handleConfirm}
          className={
            variant === "destructive"
              ? "shadow-[0_0_24px_-6px_color-mix(in_oklch,var(--destructive)_60%,transparent)]"
              : "ember-pulse"
          }
        >
          <span className="mono-tag font-bold">{confirmLabel}</span>
        </Button>
      </div>
    </Modal>
  );
}
