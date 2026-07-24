import { createContext, useContext } from 'react';
import type { Persona } from '@/shared/types/persona';
import type { PersonaEditorState } from './usePersonaEditor';

export interface PersonaFormContextValue extends PersonaEditorState {
  persona: Persona;
}

export const PersonaFormContext = createContext<PersonaFormContextValue | null>(null);

export function usePersonaForm(): PersonaFormContextValue {
  const ctx = useContext(PersonaFormContext);
  if (!ctx) {
    throw new Error('usePersonaForm must be used within a PersonaFormContext.Provider');
  }
  return ctx;
}
