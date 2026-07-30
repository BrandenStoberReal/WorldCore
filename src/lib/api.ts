import type { SettingsObject } from '@/shared/types/settings';
import type { InstructSettings } from '@/shared/types/text-options';

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

export async function fetchModelContextSize(
  source: string,
  url: string,
  model: string,
): Promise<number | null> {
  try {
    const params = new URLSearchParams({ url, model });
    const data = (await apiFetch(`/models/context?${params.toString()}`)) as {
      context_length?: number | null;
    };
    return typeof data.context_length === 'number' ? data.context_length : null;
  } catch {
    return null;
  }
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

/**
 * Read-modify-write for the settings bag. The server endpoint `/settings/save`
 * does a FULL REPLACE of the entire settings object, so callers MUST merge with
 * existing settings before sending — otherwise they silently clobber other
 * fields (e.g. theme vs connection settings). This helper handles the merge.
 */
export async function saveSettingsPatch(patch: Record<string, unknown>): Promise<unknown> {
  const current = await getSettings<Record<string, unknown>>();
  return await saveSettings({ ...current, ...patch });
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

export interface StreamTextCompletionRequest {
  text_completion_source: string;
  model: string;
  prompt: string;
  max_context?: number;
  max_length?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  min_p?: number;
  typical_p?: number;
  top_a?: number;
  tfs?: number;
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
  frequency_penalty?: number;
  presence_penalty?: number;
  seed?: number;
  min_tokens?: number;
  stop?: string[];
  streaming?: boolean;
  [key: string]: unknown;
}

/**
 * Flatten a messages array into a single prompt string for text-completion mode.
 * System messages get wrapped in [System: ...], others are "role: content".
 */
export type InstructFlattenParams = Pick<
  InstructSettings,
  | 'enabled'
  | 'inputSequence'
  | 'inputSuffix'
  | 'outputSequence'
  | 'outputSuffix'
  | 'systemSequence'
  | 'systemSuffix'
  | 'separatorSequence'
  | 'firstOutputSequence'
  | 'lastOutputSequence'
  | 'firstInputSequence'
  | 'lastInputSequence'
  | 'lastSystemSequence'
  | 'names'
  | 'wrap'
> & { systemPrompt?: string };

export function flattenMessagesToPrompt(
  messages: Array<{ role: string; content: string; name?: string }>,
  instruct?: InstructFlattenParams,
): string {
  if (!instruct?.enabled) {
    return messages
      .map((m) => {
        if (m.role === 'system') return `[System: ${m.content}]`;
        return `${m.role}: ${m.content}`;
      })
      .join('\n\n');
  }

  const parts: string[] = [];
  let isFirstUser = true;
  let isFirstAssistant = true;

  for (const m of messages) {
    if (m.role === 'system') {
      const prefix = instruct.systemSequence || '';
      const suffix = instruct.systemSuffix || '';
      parts.push(`${prefix}${m.content}${suffix}`);
    } else if (m.role === 'user') {
      const namePrefix = instruct.names && m.name ? `${m.name}: ` : '';
      let prefix = isFirstUser
        ? (instruct.firstInputSequence || instruct.inputSequence)
        : instruct.inputSequence;
      const suffix = isFirstUser
        ? (instruct.lastInputSequence || instruct.inputSuffix)
        : instruct.inputSuffix;
      prefix = instruct.wrap ? `${namePrefix}${prefix}` : `${namePrefix}${prefix}`;
      parts.push(`${prefix}${m.content}${suffix}`);
      isFirstUser = false;
    } else if (m.role === 'assistant') {
      const namePrefix = instruct.names && m.name ? `${m.name}: ` : '';
      let prefix = isFirstAssistant
        ? (instruct.firstOutputSequence || instruct.outputSequence)
        : instruct.outputSequence;
      const suffix = isFirstAssistant
        ? (instruct.lastOutputSequence || instruct.outputSuffix)
        : instruct.outputSuffix;
      prefix = instruct.wrap ? `${namePrefix}${prefix}` : `${namePrefix}${prefix}`;
      parts.push(`${prefix}${m.content}${suffix}`);
      isFirstAssistant = false;
    }
  }

  return parts.join(instruct.separatorSequence || '\n\n');
}

/**
 * Stream a text-completion request. Text-completion upstreams (llama.cpp, ooba,
 * etc.) return NDJSON lines, NOT SSE. Each line is a JSON object with a
 * `content` or `text` field containing the token.
 */
export async function* streamTextCompletion(
  request: StreamTextCompletionRequest,
): AsyncGenerator<string> {
  if (request.streaming === false) {
    const res = await fetch(`${BASE}/ai/1.1/api/openai/text/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(
        `streamTextCompletion non-streaming request failed (${res.status}): ${errText}`,
      );
    }
    const data = (await res.json()) as Record<string, unknown>;
    const content =
      (data.content as string) ||
      (data.text as string) ||
      (data.result as string) ||
      '';
    if (content) yield content;
    return;
  }

  const res = await fetch(`${BASE}/ai/1.1/api/openai/text/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`streamTextCompletion SSE request failed (${res.status}): ${errText}`);
  }

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
        let trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('data: ')) trimmed = trimmed.slice(6);
        if (trimmed === '[DONE]') return;

        try {
          const parsed = JSON.parse(trimmed) as Record<string, unknown>;
          const content =
            (parsed.content as string) ||
            (parsed.text as string) ||
            (parsed.result as string) ||
            '';
          if (content) yield content;
        } catch {
          // skip parse errors during streaming
        }
      }
    }

    if (buffer.trim()) {
      let trimmed = buffer.trim();
      if (trimmed.startsWith('data: ')) trimmed = trimmed.slice(6);
      if (trimmed !== '[DONE]') {
        try {
          const parsed = JSON.parse(trimmed) as Record<string, unknown>;
          const content =
            (parsed.content as string) ||
            (parsed.text as string) ||
            (parsed.result as string) ||
            '';
          if (content) yield content;
        } catch {
          // skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* streamChat(request: StreamChatRequest): AsyncGenerator<string> {
  // Non-streaming transport: server returns one whole JSON response.
  // Validate before parsing so 4xx/5xx surfaces as an error instead of an empty message.
  if (request.streaming === false) {
    const res = await fetch(`${BASE}/ai/1.1/api/openai/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(`streamChat non-streaming request failed (${res.status}): ${errText}`);
    }
    const data = (await res.json()) as Record<string, unknown>;
    const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
    const content = choices?.[0]?.message?.content;
    if (content) yield content;
    return;
  }

  const res = await fetch(`${BASE}/ai/1.1/api/openai/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`streamChat SSE request failed (${res.status}): ${errText}`);
  }

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

// === Generation Interceptors ===
import { getGenerationInterceptors } from '@/lib/generationInterceptorRegistry';
import type { WorldCoreGenerationContext } from '@/shared/types/worldcore-api';

/**
 * Run all registered generation interceptors sequentially against the given
 * request. Each interceptor mutates `ctx.request` in place. If an interceptor
 * throws, the error is logged and that interceptor is skipped — the chain
 * continues with the prior request. If `ctx.abort()` is called by any
 * interceptor, this function returns `null` to signal the caller to cancel.
 *
 * Generates a stable opaque `id` per call (used for cross-event correlation).
 */
export async function runGenerationInterceptors(
  request: StreamChatRequest,
  signal: AbortSignal,
): Promise<StreamChatRequest | null> {
  const interceptors = getGenerationInterceptors();
  if (interceptors.length === 0) return request;

  let aborted = false;
  const ctx: WorldCoreGenerationContext = {
    id: `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    request,
    abort: () => {
      aborted = true;
    },
  };

  for (const { id, handler, extId } of interceptors) {
    if (aborted) return null;
    if (signal.aborted) return null;
    try {
      await handler(ctx);
    } catch (err) {
      console.error(`[worldcore-ext:${extId}] generation interceptor "${id}" threw:`, err);
    }
  }

  return aborted ? null : request;
}
