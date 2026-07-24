import { useQuery } from '@tanstack/react-query';
import { getDefaultPersona, getPersona } from '@/lib/api';

export interface ResolvedPersona {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  systemPrompt: string;
  avatar: string | null;
}

export function useResolvedPersona(
  chatPersonaId: number | null | undefined,
  characterBoundPersonaId?: number | null | undefined,
) {
  const { data: defaultPersona } = useQuery({
    queryKey: ['/api/v1/personas/get-default'],
    queryFn: getDefaultPersona,
  });

  const { data: chatPersona } = useQuery({
    queryKey: ['/api/v1/personas/get', chatPersonaId],
    queryFn: () => getPersona(chatPersonaId!),
    enabled: chatPersonaId != null,
  });

  const { data: boundPersona } = useQuery({
    queryKey: ['/api/v1/personas/get', characterBoundPersonaId],
    queryFn: () => getPersona(characterBoundPersonaId!),
    enabled: characterBoundPersonaId != null,
  });

  const persona = chatPersona ?? boundPersona ?? defaultPersona;

  if (!persona) {
    return {
      name: 'User',
      description: '',
      personality: '',
      scenario: '',
      systemPrompt: '',
      avatar: null,
    };
  }

  return {
    name: persona.name || 'User',
    description: persona.description || '',
    personality: persona.personality || '',
    scenario: persona.scenario || '',
    systemPrompt: persona.systemPrompt || '',
    avatar: persona.avatar || null,
  };
}
