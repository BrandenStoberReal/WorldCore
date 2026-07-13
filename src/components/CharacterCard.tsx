import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Bot } from "lucide-react";
import type { ShallowCharacter } from "@/shared/types/character";

interface CharacterCardProps {
  character: ShallowCharacter;
  onSelect: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

export function CharacterCard({ character, onSelect, onEdit, onDelete }: CharacterCardProps) {
  const avatarUrl = `/api/v1/characters/avatar?id=${character.id}`;

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md group"
      onClick={() => onSelect(character.id)}
    >
      <CardHeader className="flex-row items-center gap-3 pb-2">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted overflow-hidden">
          <img
            src={avatarUrl}
            alt={character.name}
            className="h-12 w-12 rounded-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <Bot className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{character.name}</h3>
          {character.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {character.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {character.tags.length > 3 && (
                <span className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  +{character.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(character.id);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(character.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {character.description || "No description"}
        </p>
      </CardContent>
    </Card>
  );
}
