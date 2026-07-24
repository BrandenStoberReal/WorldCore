import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Trash2, Star, StarOff } from 'lucide-react';
import { setDefaultPersona, deletePersona } from '@/lib/api';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { Persona } from '@/shared/types/persona';

interface PersonaListProps {
  personas: Persona[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  isLoading: boolean;
}

export function PersonaList({ personas, selectedId, onSelect, isLoading }: PersonaListProps) {
  const queryClient = useQueryClient();

  const defaultMutation = useMutation({
    mutationFn: setDefaultPersona,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/v1/personas/all'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePersona,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/personas/all'] });
      onSelect(-1); // deselect
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (personas.length === 0) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        No personas yet.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {personas.map((persona) => (
        <div
          key={persona.id}
          className={cn(
            'group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            selectedId === persona.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/50',
          )}
          onClick={() => onSelect(persona.id)}
        >
          <span className="min-w-0 flex-1 truncate">{persona.name}</span>
          {persona.isDefault && (
            <Star className="h-3 w-3 shrink-0 text-amber-500" fill="currentColor" />
          )}
          <div className="hidden shrink-0 gap-0.5 group-hover:flex">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation();
                defaultMutation.mutate(persona.id);
              }}
              title={persona.isDefault ? 'Remove default' : 'Set as default'}
            >
              {persona.isDefault ? <StarOff className="h-3 w-3" /> : <Star className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive h-5 w-5"
              disabled={persona.isDefault}
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete persona "${persona.name}"?`)) {
                  deleteMutation.mutate(persona.id);
                }
              }}
              title={persona.isDefault ? 'Cannot delete default persona' : 'Delete'}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
