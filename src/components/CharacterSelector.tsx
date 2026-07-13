import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search, Bot, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { ShallowCharacter } from "@/shared/types/character";

interface CharacterSelectorProps {
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function CharacterSelector({ selectedId, onSelect }: CharacterSelectorProps) {
  const [search, setSearch] = useState("");

  const { data: characters, isLoading } = useQuery<ShallowCharacter[]>({
    queryKey: ["/api/v1/characters/all", "shallow"],
    queryFn: () => apiFetch("/characters/all", {
      method: "POST",
      body: JSON.stringify({ shallow: true }),
    }) as Promise<ShallowCharacter[]>,
  });

  const filtered = characters?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col border-r bg-sidebar">
      <div className="border-b p-3">
        <h3 className="mb-2 text-sm font-semibold text-sidebar-foreground">Characters</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm bg-sidebar-accent/50 border-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-foreground/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered?.length === 0 ? (
          <p className="py-4 text-center text-xs text-sidebar-foreground/50">
            {characters?.length === 0 ? "No characters yet" : "No matches"}
          </p>
        ) : (
          <div className="space-y-0.5">
            {filtered?.map((char) => (
              <button
                key={char.id}
                onClick={() => onSelect(char.id)}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors ${
                  selectedId === char.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent/50 overflow-hidden">
                  <img
                    src={`/api/v1/characters/avatar?id=${char.id}`}
                    alt={char.name}
                    className="h-8 w-8 rounded-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <Bot className="h-4 w-4 text-sidebar-foreground/50" />
                </div>
                <span className="truncate">{char.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
