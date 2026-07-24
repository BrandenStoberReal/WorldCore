import { useQuery } from '@tanstack/react-query';
import { listPersonas } from '@/lib/api';
import type { Persona } from '@/shared/types/persona';

interface PersonaSelectorProps {
  value: number | null;
  onChange: (personaId: number | null) => void;
}

export function PersonaSelector({ value, onChange }: PersonaSelectorProps) {
  const { data: personas = [] } = useQuery<Persona[]>({
    queryKey: ['/api/v1/personas/all'],
    queryFn: listPersonas,
  });

  return (
    <select
      value={value ?? ''}
      onChange={(e) => {
        const val = e.target.value;
        onChange(val ? Number(val) : null);
      }}
      className="border-border bg-background text-foreground rounded-md border px-2 py-1 text-sm"
    >
      <option value="">Use Default Persona</option>
      {personas.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
          {p.isDefault ? ' (default)' : ''}
        </option>
      ))}
    </select>
  );
}
