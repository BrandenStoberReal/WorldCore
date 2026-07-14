import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { cn, surfaceCard, subtleEdge } from "@/lib/utils";
import type { ShallowCharacter } from "@/shared/types/character";

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
  const avatarUrl = `/api/v1/characters/avatar?id=${character.id}`;

  return (
    <article
      className={cn(
        surfaceCard,
        subtleEdge,
        "group relative rounded-sm cursor-pointer p-0 overflow-hidden",
        "transition-all duration-200",
        "hover:-translate-y-1 hover:shadow-[0_14px_36px_-12px_color-mix(in_oklch,var(--ember)_55%,transparent)]",
        "after:translate-x-[-100%] hover:after:translate-x-0",
      )}
      onClick={() => onSelect(character.id)}
    >
      {/* Top number rail */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-background/30">
        <span className="mono-tag text-muted-foreground/55 tabular-nums">
          {`#${String(index + 1).padStart(3, "0")}`}
        </span>
        <span className="mono-tag text-muted-foreground/35 tabular-nums">
          {`id · ${character.id}`}
        </span>
      </div>

      {/* Avatar + name */}
      <div className="px-4 md:px-5 pt-4 pb-3 flex items-start gap-3 relative">
        <div className="relative shrink-0">
          <div className="h-14 w-14 rounded-full overflow-hidden border border-border bg-muted/50 flex items-center justify-center">
            <img
              src={avatarUrl}
              alt={character.name}
              className="h-14 w-14 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          {/* ember ring */}
          <span
            aria-hidden
            className="absolute -inset-[3px] rounded-full border border-ember/0 group-hover:border-ember/60 transition-colors"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3
            className="display-host text-[20px] leading-tight tracking-tight truncate"
          >
            {character.name}
          </h3>
          <div className="mono-tag text-muted-foreground/55 mt-1">
            {character.chat || "unfiled"}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 md:px-5 pb-3">
        <p className="text-[13px] leading-relaxed text-foreground/65 line-clamp-2">
          {character.description || (
            <span className="text-muted-foreground/40 italic">
              no description registered
            </span>
          )}
        </p>
      </div>

      {/* Tags */}
      {character.tags.length > 0 && (
        <div className="px-4 md:px-5 pb-3 flex flex-wrap gap-1">
          {character.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="mono-tag px-1.5 py-0.5 rounded-sm bg-muted/50 border border-border/60 text-foreground/65"
            >
              #{tag}
            </span>
          ))}
          {character.tags.length > 3 && (
            <span className="mono-tag px-1.5 py-0.5 text-muted-foreground/45">
              +{character.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Creator + Version */}
      {(character.creator || character.character_version) && (
        <div className="px-4 md:px-5 pb-3 flex items-center gap-2 text-[11px] text-muted-foreground/45 mono-tag">
          {character.creator && <span>by {character.creator}</span>}
          {character.creator && character.character_version && <span aria-hidden>·</span>}
          {character.character_version && <span>v{character.character_version}</span>}
        </div>
      )}

      {/* Action rail — appears on hover */}
      <div className="border-t border-border/60 flex items-stretch divide-x divide-border/60">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(character.id);
          }}
          className="flex-1 justify-center h-9 rounded-none border-0 font-medium hover:bg-accent/40 hover:text-ember"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span className="mono-tag">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(character.id);
          }}
          className="flex-1 justify-center h-9 rounded-none border-0 font-medium hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="mono-tag">Slag</span>
        </Button>
      </div>
    </article>
  );
}
