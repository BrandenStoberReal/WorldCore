import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback, useRef } from 'react';
import { editPersona, setPersonaAvatar, setDefaultPersona, deletePersona } from '@/lib/api';
import type { Persona } from '@/shared/types/persona';

const PERSONAS_KEY = ['/api/v1/personas/all'];

export interface PersonaEditorState {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  personality: string;
  setPersonality: (v: string) => void;
  scenario: string;
  setScenario: (v: string) => void;
  systemPrompt: string;
  setSystemPrompt: (v: string) => void;
  avatarPreview: string | null;
  avatarDataUrl: string | null;
  dragOver: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent) => void;
  handleRemoveAvatar: () => void;
  save: () => void;
  isSaving: boolean;
  setDefault: () => void;
  isSettingDefault: boolean;
  remove: () => void;
  isRemoving: boolean;
}

export function usePersonaEditor(persona: Persona): PersonaEditorState {
  const queryClient = useQueryClient();
  const [name, setName] = useState(persona.name);
  const [description, setDescription] = useState(persona.description);
  const [personality, setPersonality] = useState(persona.personality);
  const [scenario, setScenario] = useState(persona.scenario);
  const [systemPrompt, setSystemPrompt] = useState(persona.systemPrompt);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(persona.avatar || null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await editPersona(persona.id, { name, description, personality, scenario, systemPrompt });
      if (avatarDataUrl) {
        await setPersonaAvatar(persona.id, avatarDataUrl);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONAS_KEY });
    },
  });

  const defaultMutation = useMutation({
    mutationFn: () => setDefaultPersona(persona.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONAS_KEY });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePersona(persona.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PERSONAS_KEY });
    },
  });

  const save = useCallback(() => {
    saveMutation.mutate();
  }, [saveMutation]);

  const setDefault = useCallback(() => {
    defaultMutation.mutate();
  }, [defaultMutation]);

  const remove = useCallback(() => {
    if (persona.isDefault) return;
    if (window.confirm('Delete this persona? This cannot be undone.')) {
      deleteMutation.mutate();
    }
  }, [deleteMutation, persona.isDefault]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setAvatarPreview(dataUrl);
      setAvatarDataUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleRemoveAvatar = useCallback(() => {
    setAvatarPreview(null);
    setAvatarDataUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  return {
    name,
    setName,
    description,
    setDescription,
    personality,
    setPersonality,
    scenario,
    setScenario,
    systemPrompt,
    setSystemPrompt,
    avatarPreview,
    avatarDataUrl,
    dragOver,
    fileInputRef,
    handleAvatarChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveAvatar,
    save,
    isSaving: saveMutation.isPending,
    setDefault,
    isSettingDefault: defaultMutation.isPending,
    remove,
    isRemoving: deleteMutation.isPending,
  };
}
