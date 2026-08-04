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
      className="border-border bg-background text-foreground max-w-[80px] truncate rounded-md border px-1 py-0.5 text-[11px] sm:max-w-none sm:px-2 sm:py-1 sm:text-sm"
    >
      <option value="">Use Default</option>
      {personas.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
          {p.isDefault ? ' (default)' : ''}
        </option>
      ))}
    </select>
  );
}
