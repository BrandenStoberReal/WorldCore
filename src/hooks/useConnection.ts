import { useCallback, useEffect, useState } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { apiFetch, saveSettingsPatch } from '@/lib/api';
import { useNavStore } from '@/lib/navStore';
import { useGenerationStore } from '@/lib/stores';
import { toastSuccess, toastError } from '@/lib/toast';
import type { ConnectionProfile } from '@/shared/schemas/connection-profile';

export type ApiType = 'textgenerationwebui' | 'openai' | 'novel' | 'koboldhorde';

export function modeForApiType(api: ApiType): 'chat' | 'text' {
  return api === 'textgenerationwebui' ? 'text' : 'chat';
}

const PROFILE_QUERY_KEY = ['/api/v1/connection-profiles/all'] as const;
const STORAGE_KEY = 'worldcore/connection';

interface PersistedConnectionState {
  autoConnect: boolean;
  selectedProfileId: string | null;
}

function loadPersisted(): PersistedConnectionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { autoConnect: false, selectedProfileId: null };
    const parsed = JSON.parse(raw) as Partial<PersistedConnectionState>;
    return {
      autoConnect: typeof parsed.autoConnect === 'boolean' ? parsed.autoConnect : false,
      selectedProfileId:
        typeof parsed.selectedProfileId === 'string' ? parsed.selectedProfileId : null,
    };
  } catch {
    return { autoConnect: false, selectedProfileId: null };
  }
}

function persistConnection(state: PersistedConnectionState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* noop */
  }
}

export interface UseConnectionReturn {
  // Profile state
  profiles: ConnectionProfile[] | undefined;
  profilesLoading: boolean;
  profilesError: Error | null;
  selectedProfileId: string | null;
  setSelectedProfileId: (id: string | null) => void;
  selectedProfile: ConnectionProfile | undefined;

  // API type
  apiType: ApiType;
  setApiType: (type: ApiType) => void;

  // Connection state
  connected: boolean;
  setConnected: (next: boolean) => void;
  connectionError: string | null;
  setConnectionError: (err: string | null) => void;
  saved: boolean;

  // Auto-connect
  autoConnect: boolean;
  setAutoConnect: (v: boolean) => void;

  // Profile CRUD mutations
  createMutation: UseMutationResult<unknown, Error, ConnectionProfile>;
  updateMutation: UseMutationResult<unknown, Error, ConnectionProfile>;
  deleteMutation: UseMutationResult<unknown, Error, string>;
  isProfileLoading: boolean;

  // Handlers
  handleConnect: (config: Record<string, unknown>) => Promise<void>;
  handleReset: () => void;
  handleCloneProfile: (id: string) => void;

  /**
   * Monotonic counter bumped on reset / profile reload so child panels
   * (TextGenPanel, ChatCompletionPanel, etc.) re-mount fresh. Children key
   * off this via `key={\`textgen-${profileKey}\`}` etc. — kept in the hook
   * (not the panel) so any consumer can force a child remount.
   */
  profileKey: number;
  bumpProfileKey: () => void;
}

/**
 * Centralizes connection-panel state + mutations so ConnectionsPanel stays
 * a thin UI shell and App.tsx can read auto-connect config from the same
 * source on boot.
 *
 * Persistence: `{ autoConnect, selectedProfileId }` is mirrored to
 * localStorage key `worldcore/connection` on every change so a page reload
 * can restore the user's last connection intent.
 */
export function useConnection(): UseConnectionReturn {
  const queryClient = useQueryClient();
  const setConnected = useNavStore((s) => s.setConnected);
  const setMode = useGenerationStore((s) => s.setMode);

  const persisted = loadPersisted();

  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    persisted.selectedProfileId,
  );
  const [apiType, setApiType] = useState<ApiType>('textgenerationwebui');
  const [autoConnect, setAutoConnectState] = useState<boolean>(persisted.autoConnect);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [profileKey, setProfileKey] = useState(0);

  const connected = useNavStore((s) => s.connected);

  // Persist autoConnect + selectedProfileId whenever either changes.
  useEffect(() => {
    persistConnection({ autoConnect, selectedProfileId });
  }, [autoConnect, selectedProfileId]);

  // Fetch profiles
  const {
    data: profiles,
    isLoading: profilesLoading,
    error: profilesError,
  } = useQuery<ConnectionProfile[]>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () =>
      apiFetch('/connection-profiles/all', {
        method: 'POST',
        body: JSON.stringify({}),
      }) as Promise<ConnectionProfile[]>,
    meta: { silenceErrorToast: true },
  });

  const selectedProfile = profiles?.find((p) => p.id === selectedProfileId);

  // Sync apiType from selected profile
  useEffect(() => {
    if (selectedProfile) {
      const profileApi = selectedProfile.api as ApiType;
      if (
        profileApi &&
        ['textgenerationwebui', 'openai', 'novel', 'koboldhorde'].includes(profileApi)
      ) {
        setApiType(profileApi);
        setMode(modeForApiType(profileApi));
      }
    }
  }, [selectedProfile, setMode]);

  // Create mutation
  const createMutation = useMutation<unknown, Error, ConnectionProfile>({
    mutationFn: async (data: ConnectionProfile) => {
      return apiFetch('/connection-profiles/create', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      toastSuccess('Connection profile created');
    },
    onError: (err) => {
      toastError(err);
    },
  });

  const updateMutation = useMutation<unknown, Error, ConnectionProfile>({
    mutationFn: async (data: ConnectionProfile) => {
      return apiFetch('/connection-profiles/update', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      toastSuccess('Connection profile updated');
    },
    onError: (err) => {
      toastError(err);
    },
  });

  const deleteMutation = useMutation<unknown, Error, string>({
    mutationFn: async (id: string) => {
      return apiFetch('/connection-profiles/delete', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
    },
    onSuccess: (_, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      if (selectedProfileId === deletedId) {
        setSelectedProfileId(null);
      }
      toastSuccess('Connection profile deleted');
    },
    onError: (err) => {
      toastError(err);
    },
  });

  const isProfileLoading =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const handleCloneProfile = useCallback(
    (id: string) => {
      const profile = profiles?.find((p) => p.id === id);
      if (!profile) return;

      const baseName = profile.name.replace(/\s*\(\d+\)$/, '');
      const existingNames = new Set((profiles ?? []).map((p) => p.name));
      let cloneName = `${baseName} (1)`;
      let counter = 2;
      while (existingNames.has(cloneName)) {
        cloneName = `${baseName} (${counter})`;
        counter++;
      }

      const now = new Date().toISOString();
      createMutation.mutate({
        ...profile,
        id: crypto.randomUUID(),
        name: cloneName,
        isDefault: false,
        createdAt: now,
        updatedAt: now,
      });
    },
    [profiles, createMutation],
  );

  const handleConnect = useCallback(
    async (config: Record<string, unknown>) => {
      const source = (typeof config.type === 'string' && config.type) || apiType;
      const model = (typeof config.model === 'string' && config.model) || '';
      const url = (typeof config._url === 'string' && config._url) || 'http://localhost:8080';
      setConnectionError(null);
      try {
        await saveSettingsPatch({
          chat_completion_source: source,
          chat_completion_model: model,
          reverse_proxy: url,
          api: apiType,
          autoConnect,
        });

        try {
          await apiFetch(`/models/${source}?url=${encodeURIComponent(url)}`);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Connection failed';
          setConnected(false);
          setConnectionError(msg);
          return;
        }

        setConnected(true);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Connection failed';
        setConnected(false);
        setConnectionError(msg);
      }
    },
    [apiType, autoConnect, setConnected],
  );

  const handleReset = useCallback(() => {
    setConnected(false);
    setSelectedProfileId(null);
    setApiType('textgenerationwebui');
    setAutoConnectState(false);
    setProfileKey((k) => k + 1);
  }, [setConnected]);

  const setAutoConnect = useCallback((v: boolean) => {
    setAutoConnectState(v);
  }, []);

  const bumpProfileKey = useCallback(() => {
    setProfileKey((k) => k + 1);
  }, []);

  return {
    profiles,
    profilesLoading,
    profilesError,
    selectedProfileId,
    setSelectedProfileId,
    selectedProfile,

    apiType,
    setApiType,

    connected,
    setConnected,
    connectionError,
    setConnectionError,
    saved,

    autoConnect,
    setAutoConnect,

    createMutation,
    updateMutation,
    deleteMutation,
    isProfileLoading,

    handleConnect,
    handleReset,
    handleCloneProfile,

    profileKey,
    bumpProfileKey,
  };
}
