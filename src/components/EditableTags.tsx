import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { apiPost } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

interface EditableTagsProps {
  /** Character ID for the API call */
  characterId: number;
  /** Current tags array */
  tags: string[];
  /** React Query keys to invalidate after save */
  invalidateKeys?: Array<unknown[]>;
}

export function EditableTags({ characterId, tags, invalidateKeys = [] }: EditableTagsProps) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [savingField, setSavingField] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [adding]);

  const saveTags = useCallback(
    async (nextTags: string[]) => {
      setSavingField('tags');

      const previousData = new Map<unknown[], unknown>();
      for (const key of invalidateKeys) {
        previousData.set(key, queryClient.getQueryData(key));
        queryClient.setQueryData(key, (old: Record<string, unknown> | undefined) => {
          if (!old) return old;
          return { ...old, tags: nextTags };
        });
      }

      try {
        await apiPost('/characters/edit-attribute', {
          id: characterId,
          field: 'tags',
          value: nextTags,
        });
        for (const key of invalidateKeys) {
          await queryClient.invalidateQueries({ queryKey: key });
        }
      } catch (err) {
        console.error('Failed to save tags:', err);
        for (const [key, prev] of previousData) {
          queryClient.setQueryData(key, prev);
        }
      } finally {
        setSavingField(null);
      }
    },
    [characterId, invalidateKeys, queryClient],
  );

  const removeTag = useCallback(
    (tag: string) => {
      saveTags(tags.filter((t) => t !== tag));
    },
    [tags, saveTags],
  );

  const addTag = useCallback(() => {
    const trimmed = newTag.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setAdding(false);
      setNewTag('');
      return;
    }
    saveTags([...tags, trimmed]);
    setNewTag('');
    setAdding(false);
  }, [newTag, tags, saveTags]);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag();
      } else if (e.key === 'Escape') {
        setAdding(false);
        setNewTag('');
      }
    },
    [addTag],
  );

  const isSaving = savingField === 'tags';

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="group/tag mono-tag bg-muted/50 border-border/60 text-foreground/65 relative inline-flex items-center gap-0.5 rounded-sm border px-1.5 py-0.5"
        >
          <span>{tag}</span>
          <button
            type="button"
            onClick={() => removeTag(tag)}
            disabled={isSaving}
            title={`Remove tag: ${tag}`}
            aria-label={`Remove tag ${tag}`}
            className={cn(
              'text-foreground/30 hover:text-destructive rounded-sm transition-colors',
              'opacity-0 group-hover/tag:opacity-100',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
          >
            {isSaving ? (
              <Loader2 className="h-2 w-2 animate-spin" />
            ) : (
              <X className="h-2 w-2" strokeWidth={2.5} />
            )}
          </button>
        </span>
      ))}

      {adding ? (
        <span className="mono-tag bg-muted/50 border-border/60 inline-flex items-center rounded-sm border px-1.5 py-0.5">
          <input
            ref={inputRef}
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={addTag}
            placeholder="tag name"
            className="text-foreground/80 w-16 bg-transparent text-[10px] outline-none"
          />
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          title="Add tag"
          aria-label="Add tag"
          disabled={isSaving}
          className={cn(
            'mono-tag bg-muted/30 border-border/30 text-foreground/30 hover:text-ember hover:border-ember/30',
            'inline-flex items-center gap-0.5 rounded-sm border px-1.5 py-0.5 transition-colors',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          <Plus className="h-2 w-2" strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
