import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'default' | 'destructive';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'destructive',
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-md">
      <div className="mb-5 flex items-start gap-3">
        <div className="border-destructive/40 bg-destructive/10 text-destructive flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <p className="text-muted-foreground pt-1.5 text-[13.5px] leading-relaxed">{message}</p>
      </div>

      <div className="border-border/60 flex justify-end gap-2 border-t pt-3">
        <Button variant="outline" onClick={onClose}>
          <span className="mono-tag">cancel</span>
        </Button>
        <Button
          variant={variant}
          onClick={handleConfirm}
          className={
            variant === 'destructive'
              ? 'shadow-[0_0_24px_-6px_color-mix(in_oklch,var(--destructive)_60%,transparent)]'
              : 'ember-pulse'
          }
        >
          <span className="mono-tag font-bold">{confirmLabel}</span>
        </Button>
      </div>
    </Modal>
  );
}
