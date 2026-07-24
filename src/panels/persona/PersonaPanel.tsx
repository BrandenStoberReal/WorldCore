import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Plus, Save } from 'lucide-react';
import { listPersonas, createPersona } from '@/lib/api';
import { PersonaList } from './PersonaList';
import { PersonaForm } from './PersonaForm';
import { usePersonaEditor } from './usePersonaEditor';
import type { Persona } from '@/shared/types/persona';

export function PersonaPanel() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: personas = [], isLoading } = useQuery<Persona[]>({
    queryKey: ['/api/v1/personas/all'],
    queryFn: listPersonas,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createPersona({
        name: 'New Persona',
        description: '',
        personality: '',
        scenario: '',
        systemPrompt: '',
        avatar: '',
        isDefault: false,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/personas/all'] });
      setSelectedId(result.id);
    },
  });

  const selected = personas.find((p) => p.id === selectedId) ?? null;
  const editor = usePersonaEditor(selected ?? placeholderPersona);

  return (
    <div data-panel="personas" className="section-rhythm relative isolate">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          tag="PERSONAS"
          title="Personas"
          description="Manage user personas for chat sessions."
          action={
            <div className="flex items-center gap-2">
              {selected && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={editor.save}
                  disabled={editor.isSaving}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {editor.isSaving ? 'Saving...' : 'Save'}
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
              >
                <Plus className="mr-1 h-3 w-3" />
                New
              </Button>
            </div>
          }
        />

        <div className="mt-4 flex gap-4">
          <div className="w-64 shrink-0">
            <PersonaList
              personas={personas}
              selectedId={selectedId}
              onSelect={setSelectedId}
              isLoading={isLoading}
            />
          </div>
          {selected ? (
            <PersonaForm persona={selected} editor={editor} />
          ) : (
            <div className="text-muted-foreground flex min-w-0 flex-1 items-center justify-center text-sm">
              Select a persona or create a new one.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Stable placeholder so usePersonaEditor's hooks always run with a valid object.
// The editor is only consumed (save button rendered) when `selected` is truthy.
const placeholderPersona: Persona = {
  id: 0,
  name: '',
  description: '',
  personality: '',
  scenario: '',
  systemPrompt: '',
  avatar: '',
  isDefault: false,
  dateAdded: 0,
  dateModified: 0,
};
