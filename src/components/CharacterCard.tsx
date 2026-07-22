import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { cn, surfaceCard, subtleEdge } from '@/lib/utils';
import type { ShallowCharacter } from '@/shared/types/character';

interface CharacterCardProps {
  character: ShallowCharacter;
  index?: number;
  onSelect: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export function CharacterCard({
  character,
  index = 0,
  onSelect,
  onEdit,
  onDelete,
}: CharacterCardProps) {
  const avatarUrl = `/api/v1/characters/thumbnail?id=${character.id}`;

  return (
    <article
      className={cn(
        surfaceCard,
        subtleEdge,
        'group relative cursor-pointer overflow-hidden rounded-md p-0',
        'transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-12px_color-mix(in_oklch,var(--ember)_55%,transparent)]',
        'after:translate-x-[-100%] hover:after:translate-x-0',
      )}
      onClick={() => onSelect(character.id)}
    >
      {/* Top number rail */}
      <div className="border-border/60 bg-background/30 flex items-center justify-between border-b px-3 py-1.5">
        <span className="mono-tag text-muted-foreground/55 tabular-nums">
          {`#${String(index + 1).padStart(3, '0')}`}
        </span>
        <span className="mono-tag text-muted-foreground/35 tabular-nums">
          {`id · ${character.id}`}
        </span>
      </div>

      {/* Avatar + name */}
      <div className="relative flex items-start gap-2.5 px-3 pt-3 pb-2 md:px-3.5">
        <div className="relative shrink-0">
          <div className="border-border bg-muted/50 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border">
            <img
              src={avatarUrl}
              alt={character.name}
              className="h-11 w-11 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          {/* ember ring */}
          <span
            aria-hidden
            className="border-ember/0 group-hover:border-ember/60 absolute -inset-[2px] rounded-full border transition-colors"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="display-host truncate text-[17px] leading-tight tracking-tight">
            {character.name}
          </h3>
          <div className="mono-tag text-muted-foreground/55 mt-0.5">
            {character.chat || 'unfiled'}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="px-3 pb-2 md:px-3.5">
        <p className="text-foreground/65 line-clamp-2 text-[12px] leading-relaxed">
          {character.description || (
            <span className="text-muted-foreground/40 italic">no description registered</span>
          )}
        </p>
      </div>

      {/* Tags */}
      {character.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pb-2 md:px-3.5">
          {character.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="mono-tag bg-muted/50 border-border/60 text-foreground/65 rounded-md border px-1 py-px"
            >
              #{tag}
            </span>
          ))}
          {character.tags.length > 3 && (
            <span className="mono-tag text-muted-foreground/45 px-1 py-px">
              +{character.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Creator + Version */}
      {(character.creator || character.character_version) && (
        <div className="text-muted-foreground/45 mono-tag flex items-center gap-2 px-3 pb-2 text-[10px] md:px-3.5">
          {character.creator && <span>by {character.creator}</span>}
          {character.creator && character.character_version && <span aria-hidden>·</span>}
          {character.character_version && <span>v{character.character_version}</span>}
        </div>
      )}

      {/* Action rail — appears on hover */}
      <div className="border-border/60 divide-border/60 flex items-stretch divide-x border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(character.id);
          }}
          className="hover:bg-accent/40 hover:text-ember h-8 flex-1 justify-center rounded-none border-0 font-medium"
        >
          <Pencil className="h-3 w-3" />
          <span className="mono-tag">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(character.id);
          }}
          className="hover:bg-destructive/10 hover:text-destructive h-8 flex-1 justify-center rounded-none border-0 font-medium"
        >
          <Trash2 className="h-3 w-3" />
          <span className="mono-tag">Slag</span>
        </Button>
      </div>
    </article>
  );
}
