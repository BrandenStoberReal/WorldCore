import { useState } from 'react';
import {
  Info,
  Plus,
  Save,
  Pencil,
  RefreshCw,
  Trash2,
  Loader2,
  HelpCircle,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionProfile {
  id: string;
  name: string;
  api: string;
  model: string;
}

interface ConnectionProfileSelectorProps {
  profiles: ConnectionProfile[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onView?: (id: string) => void;
  onCreate?: () => void;
  onUpdate?: (id: string) => void;
  onEdit?: (id: string) => void;
  onClone?: (id: string) => void;
  onReload?: (id: string) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
  className?: string;
}

/**
 * Inline connection profile selector matching SillyTavern's `rm_api_block`
 * layout: a compact row with a dropdown and icon action buttons.
 */
export function ConnectionProfileSelector({
  profiles,
  selectedId,
  onSelect,
  onView,
  onCreate,
  onUpdate,
  onEdit,
  onClone,
  onReload,
  onDelete,
  loading = false,
  className,
}: ConnectionProfileSelectorProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const selected = profiles.find((p) => p.id === selectedId);

  const handleSelect = (value: string) => {
    onSelect(value === '' ? null : value);
    if (value !== '' && !detailsOpen) {
      setDetailsOpen(true);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Header row */}
      <div className="mb-1.5 flex items-center gap-2">
        <h3 className="text-[15px] leading-none font-semibold tracking-tight">
          Connection Profile
        </h3>
        <a
          href="https://docs.sillytavern.app/usage/core-concepts/connection-profiles"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground/50 hover:text-ember transition-colors"
          title="Connection profile documentation"
        >
          <HelpCircle className="h-4 w-4" />
        </a>
        {loading && <Loader2 className="text-ember/70 h-4 w-4 animate-spin" />}
      </div>

      {/* Selector row */}
      <div className="flex items-center gap-1.5">
        {/* Profile dropdown */}
        <select
          value={selectedId ?? ''}
          onChange={(e) => handleSelect(e.target.value)}
          className="bg-background border-border focus:ring-ember/50 focus:border-ember/50 h-9 flex-1 rounded-md border px-3 font-mono text-[13px] tracking-tight transition-colors focus:ring-1 focus:outline-none"
        >
          <option value="">&lt;None&gt;</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Action buttons */}
        <ActionButton
          icon={Info}
          title="View connection profile details"
          onClick={() => {
            if (selectedId) {
              onView?.(selectedId);
              setDetailsOpen(!detailsOpen);
            }
          }}
          disabled={!selectedId}
        />
        <ActionButton
          icon={Plus}
          title="Create a new connection profile"
          onClick={() => onCreate?.()}
        />
        <ActionButton
          icon={Save}
          title="Update a connection profile"
          onClick={() => selectedId && onUpdate?.(selectedId)}
          disabled={!selectedId}
        />
        <ActionButton
          icon={Pencil}
          title="Edit a connection profile"
          onClick={() => selectedId && onEdit?.(selectedId)}
          disabled={!selectedId}
        />
        <ActionButton
          icon={Copy}
          title="Clone this connection profile"
          onClick={() => selectedId && onClone?.(selectedId)}
          disabled={!selectedId}
        />
        <ActionButton
          icon={RefreshCw}
          title="Reload a connection profile"
          onClick={() => selectedId && onReload?.(selectedId)}
          disabled={!selectedId}
        />
        <ActionButton
          icon={Trash2}
          title="Delete a connection profile"
          onClick={() => selectedId && onDelete?.(selectedId)}
          disabled={!selectedId}
          variant="destructive"
        />
      </div>

      {/* Expandable details */}
      {detailsOpen && selected && (
        <div className="border-border/60 bg-muted/20 mt-2 space-y-1 rounded-md border p-3 text-[13px]">
          <DetailRow label="API" value={selected.api} />
          <DetailRow label="Model" value={selected.model} />
          <DetailRow
            label="ID"
            value={selected.id}
            className="text-muted-foreground/50 font-mono text-[11px]"
          />
        </div>
      )}
    </div>
  );
}

/* ── Helpers ── */

function ActionButton({
  icon: Icon,
  title,
  onClick,
  disabled = false,
  variant = 'default',
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive';
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md border transition-colors',
        'focus:ring-ember/50 focus:ring-1 focus:outline-none',
        disabled
          ? 'border-border/40 bg-muted/30 text-muted-foreground/30 cursor-not-allowed'
          : variant === 'destructive'
            ? 'border-border bg-background hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive text-muted-foreground/70'
            : 'border-border bg-background hover:bg-accent/50 hover:border-ember/30 hover:text-ember text-muted-foreground/70',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="mono-tag text-muted-foreground/50 w-12 shrink-0 text-[11px] tracking-wider uppercase">
        {label}
      </span>
      <span className={cn('text-foreground/70', className)}>{value}</span>
    </div>
  );
}
