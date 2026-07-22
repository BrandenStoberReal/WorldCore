import { useState, useRef, useEffect, useCallback } from 'react';
import { Pencil, Check, Loader2 } from 'lucide-react';
import { apiPost } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface InlineEditProps {
  characterId: number;
  field: string;
  value: string | undefined;
  invalidateKeys?: Array<unknown[]>;
  multiline?: boolean;
  placeholder?: string;
  heading?: boolean;
  className?: string;
  onSave?: (newValue: string) => void;
}

export function InlineEdit({
  characterId,
  field,
  value,
  invalidateKeys = [],
  multiline = false,
  placeholder,
  heading = false,
  className,
  onSave,
}: InlineEditProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Sync draft when external value changes
  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  // Auto-focus, select, and auto-size textarea when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
      if (inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.style.height = 'auto';
        inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
      }
    }
  }, [editing]);

  const save = useCallback(async () => {
    const trimmed = draft.trim();
    // Don't save if value hasn't changed
    if (trimmed === (value ?? '')) {
      setEditing(false);
      return;
    }
    setSaving(true);

    // Optimistic update: immediately write the new value into every matching query cache
    const previousData = new Map<unknown[], unknown>();
    for (const key of invalidateKeys) {
      previousData.set(key, queryClient.getQueryData(key));
      queryClient.setQueryData(key, (old: Record<string, unknown> | undefined) => {
        if (!old) return old;
        return { ...old, [field]: trimmed };
      });
    }

    try {
      await apiPost('/characters/edit-attribute', {
        id: characterId,
        field,
        value: trimmed,
      });
      // Re-validate to ensure consistency with server
      for (const key of invalidateKeys) {
        await queryClient.invalidateQueries({ queryKey: key });
      }
      onSave?.(trimmed);
    } catch (err) {
      console.error(`Failed to save ${field}:`, err);
      // Roll back optimistic update
      for (const [key, prev] of previousData) {
        queryClient.setQueryData(key, prev);
      }
      setDraft(value ?? '');
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }, [draft, value, characterId, field, invalidateKeys, queryClient, onSave]);

  const cancel = useCallback(() => {
    setDraft(value ?? '');
    setEditing(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !multiline) {
        e.preventDefault();
        save();
      } else if (e.key === 'Escape') {
        cancel();
      }
    },
    [save, cancel, multiline],
  );

  const handleTextAreaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  }, []);

  if (editing) {
    const inputClasses = cn(
      'w-full bg-transparent outline-none text-foreground/80',
      heading ? 'display-host text-[16px] leading-tight' : 'text-[12px] leading-relaxed',
      'border-b border-ember/50',
      multiline ? 'resize-none' : '',
    );

    return (
      <div className="relative">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            onChange={handleTextAreaChange}
            onKeyDown={handleKeyDown}
            onBlur={save}
            className={cn(inputClasses, 'max-h-[200px] overflow-y-auto')}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={save}
            className={inputClasses}
            placeholder={placeholder}
          />
        )}
        {saving && (
          <Loader2 className="text-ember absolute top-1/2 right-0 h-3 w-3 -translate-y-1/2 animate-spin" />
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        'group/inline group/edit relative flex w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-left transition-colors',
        'hover:bg-accent/20',
        className,
      )}
    >
      {heading ? (
        <span className="display-host text-[16px] leading-tight">{value || placeholder}</span>
      ) : (
        <span className="text-foreground/70 text-[12px] leading-relaxed break-words whitespace-pre-wrap">
          {value || (
            <span className="text-muted-foreground/40 text-[11px] italic">{placeholder}</span>
          )}
        </span>
      )}
      <Pencil className="text-foreground/0 group-hover/inline:text-foreground/30 h-2.5 w-2.5 shrink-0 transition-colors" />
    </button>
  );
}
