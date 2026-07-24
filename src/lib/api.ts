import type { SettingsObject } from '@/shared/types/settings';

const BASE = '/api/v1';

export async function apiFetch(path: string, options?: RequestInit): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : (data.results ?? data.data ?? data);
}

/** GET request reusing the apiFetch BASE + unwrap logic. */
export async function apiGet<T>(path: string): Promise<T> {
  return (await apiFetch(path, { method: 'GET' })) as T;
}

/** POST request with optional JSON body, reusing the apiFetch BASE + unwrap logic. */
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const options: RequestInit = { method: 'POST' };
  if (body !== undefined) options.body = JSON.stringify(body);
  return (await apiFetch(path, options)) as T;
}

/** Read a secret by key; returns null when the secret is absent or not found. */
export async function readSecret(key: string): Promise<string | null> {
  try {
    const value = await apiPost<string | null>('/secrets/read', { key });
    return value ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('API error 404') || /not\s*found/i.test(msg)) return null;
    throw err;
  }
}

/** Write (create or update) a secret value with an optional display label. */
export async function writeSecret(key: string, value: string, label?: string): Promise<void> {
  await apiPost('/secrets/write', { key, value, label });
}

/** View all secrets (or a single secret when the backend supports a key filter). */
export async function viewSecrets(): Promise<unknown> {
  return await apiPost('/secrets/view', {});
}

/** Fetch the current settings object. */
export async function getSettings<T = SettingsObject>(): Promise<T> {
  return await apiGet<T>('/settings/get');
}

/** Save a patch of settings. */
export async function saveSettings(patch: Record<string, unknown>): Promise<unknown> {
  return await apiPost('/settings/save', patch);
}

/** List all presets in a category. */
export async function listPresets(category: string): Promise<unknown[]> {
  return await apiPost<unknown[]>('/presets/all', { category });
}

/** Get a single preset by category and name. */
export async function getPreset(category: string, name: string): Promise<unknown> {
  return await apiPost('/presets/get', { category, name });
}

/** Save (create or update) a preset object. */
export async function savePreset(preset: Record<string, unknown>): Promise<unknown> {
  return await apiPost('/presets/save', { preset });
}

/** Check if onboarding is needed (first boot). */
export async function checkOnboardingStatus(): Promise<boolean> {
  const res = await apiFetch('/onboarding/status', { method: 'GET' });
  return (res as { onboarding: boolean }).onboarding;
}

/** Complete onboarding with the selected backend configuration. */
export async function completeOnboarding(config: {
  backend: 'sqlite' | 'mongodb' | 'jsonfiles';
  mongodbUri?: string;
}): Promise<void> {
  await apiPost('/onboarding/complete', config);
}

export interface StreamChatRequest {
  chat_completion_source: string;
  model: string;
  messages: Array<{ role: string; content: string; name?: string }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  min_p?: number;
  typical_p?: number;
  top_a?: number;
  tfs?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  rep_pen?: number;
  rep_pen_range?: number;
  rep_pen_slope?: number;
  dry_multiplier?: number;
  dry_base?: number;
  dry_allowed_length?: number;
  mirostat_mode?: number;
  mirostat_tau?: number;
  mirostat_eta?: number;
  smoothing_factor?: number;
  epsilon_cutoff?: number;
  eta_cutoff?: number;
  seed?: number;
  min_tokens?: number;
  stop?: string[];
  streaming?: boolean;
  [key: string]: unknown;
}

export async function* streamChat(request: StreamChatRequest): AsyncGenerator<string> {
  const res = await fetch(`${BASE}/ai/1.1/api/openai/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.body) {
    throw new Error('No stream body');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  try {
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          const choices = parsed.choices as Array<{ delta?: { content?: string } }> | undefined;
          const content = choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // skip parse errors during streaming
        }
      }
    }

    if (buffer.length > 0) {
      if (buffer.startsWith('data: ')) {
        const data = buffer.slice(6);
        if (data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data) as Record<string, unknown>;
            const choices = parsed.choices as Array<{ delta?: { content?: string } }> | undefined;
            const content = choices?.[0]?.delta?.content;
            if (content) yield content;
          } catch {
            // skip
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// === Persona API ===
import type { Persona, PersonaCreateInput, PersonaEditInput } from '@/shared/types/persona';

export async function listPersonas(): Promise<Persona[]> {
  return await apiPost<Persona[]>('/personas/all', {});
}

export async function getDefaultPersona(): Promise<Persona | null> {
  return await apiPost<Persona | null>('/personas/get-default', {});
}

export async function getPersona(id: number): Promise<Persona | null> {
  return await apiPost<Persona | null>('/personas/get', { id });
}

export async function createPersona(
  input: PersonaCreateInput,
): Promise<{ ok: boolean; id: number }> {
  return await apiPost<{ ok: boolean; id: number }>('/personas/create', input);
}

export async function editPersona(id: number, patch: PersonaEditInput): Promise<{ ok: boolean }> {
  return await apiPost<{ ok: boolean }>('/personas/edit', { id, ...patch });
}

export async function renamePersona(id: number, name: string): Promise<{ ok: boolean }> {
  return await apiPost<{ ok: boolean }>('/personas/rename', { id, name });
}

export async function setDefaultPersona(id: number): Promise<{ ok: boolean }> {
  return await apiPost<{ ok: boolean }>('/personas/set-default', { id });
}

export async function setPersonaAvatar(id: number, avatar: string): Promise<{ ok: boolean }> {
  return await apiPost<{ ok: boolean }>('/personas/set-avatar', { id, avatar });
}

export async function deletePersona(id: number): Promise<{ ok: boolean }> {
  return await apiPost<{ ok: boolean }>('/personas/delete', { id });
}

export async function bindCharacterPersona(
  characterId: number,
  personaId: number | null,
): Promise<{ ok: boolean }> {
  return await apiPost<{ ok: boolean }>('/characters/bind-persona', { id: characterId, personaId });
}

export async function setChatPersona(
  fileId: string,
  personaId: number | null,
): Promise<{ ok: boolean }> {
  return await apiPost<{ ok: boolean }>('/chats/set-persona', { fileId, personaId });
}
