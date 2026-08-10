import type { SettingsObject } from '@/shared/types/settings';
import type { InstructSettings } from '@/shared/types/text-options';
import { substituteMacros, type MacroContext } from '@/lib/macros';

const BASE = '/api/v1';

export async function apiFetch(path: string, options?: RequestInit): Promise<unknown> {
  const isFormData = options?.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    ...(isFormData ? {} : { headers: { 'Content-Type': 'application/json' } }),
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

let _settingsPatchQueue: Promise<unknown> = Promise.resolve();

export async function saveSettingsPatch(patch: Record<string, unknown>): Promise<unknown> {
  _settingsPatchQueue = _settingsPatchQueue.then(async () => {
    const current = await getSettings<Record<string, unknown>>();
    return saveSettings({ ...current, ...patch });
  });
  return _settingsPatchQueue;
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

/** Delete a preset by category and name. */
export async function deletePreset(category: string, name: string): Promise<unknown> {
  return await apiPost('/presets/delete', { category, name });
}

/** Rename a preset by category, old name, and new name. */
export async function renamePreset(
  category: string,
  oldName: string,
  newName: string,
): Promise<unknown> {
  return await apiPost('/presets/rename', { category, oldName, newName });
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
> & {
  systemPrompt?: string;
  namesBehavior?: InstructSettings['namesBehavior'];
  systemSameAsUser?: boolean;
};

export interface FlattenContextParams {
  chatStart?: string;
  exampleSeparator?: string;
  trimSpaces?: boolean;
  collapseNewlines?: boolean;
  singleLine?: boolean;
}

export function flattenMessagesToPrompt(
  messages: Array<{ role: string; content: string; name?: string }>,
  instruct?: InstructFlattenParams,
  context?: FlattenContextParams,
): string {
  let prompt: string;
  if (!instruct?.enabled) {
    prompt = messages
      .map((m) => {
        if (m.role === 'system') return `[System: ${m.content}]`;
        return `${m.role}: ${m.content}`;
      })
      .join('\n\n');
  } else {
    const parts: string[] = [];
    let isFirstUser = true;
    let isFirstAssistant = true;
    const namesBehavior = instruct.namesBehavior ?? (instruct.names ? 'force' : 'none');

    for (const m of messages) {
      if (m.role === 'system') {
        const namePrefix = namesBehavior === 'always' && m.name ? `${m.name}: ` : '';
        if (instruct.systemSameAsUser) {
          parts.push(
            `${namePrefix}${instruct.inputSequence || ''}${m.content}${instruct.inputSuffix || ''}`,
          );
        } else {
          parts.push(
            `${namePrefix}${instruct.systemSequence || ''}${m.content}${instruct.systemSuffix || ''}`,
          );
        }
      } else if (m.role === 'user') {
        const namePrefix = namesBehavior !== 'none' && m.name ? `${m.name}: ` : '';
        let prefix = isFirstUser
          ? instruct.firstInputSequence || instruct.inputSequence
          : instruct.inputSequence;
        const suffix = instruct.inputSuffix;
        prefix = `${namePrefix}${prefix}`;
        parts.push(`${prefix}${m.content}${suffix}`);
        isFirstUser = false;
      } else if (m.role === 'assistant') {
        const namePrefix = namesBehavior !== 'none' && m.name ? `${m.name}: ` : '';
        let prefix = isFirstAssistant
          ? instruct.firstOutputSequence || instruct.outputSequence
          : instruct.outputSequence;
        const suffix = instruct.outputSuffix;
        prefix = `${namePrefix}${prefix}`;
        parts.push(`${prefix}${m.content}${suffix}`);
        isFirstAssistant = false;
      }
    }

    prompt = parts.join(instruct.separatorSequence ?? '\n\n');
  }

  if (context?.chatStart && context.chatStart.trim().length > 0) {
    const chatStartContent = context.chatStart.trim();
    const alreadyPresent = messages.some(
      (m) => m.role === 'system' && m.content.trim() === chatStartContent,
    );
    if (!alreadyPresent) {
      prompt = `${context.chatStart}\n${prompt}`;
    }
  }

  if (context?.trimSpaces) {
    prompt = prompt
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      .trim();
  }
  if (context?.collapseNewlines) {
    prompt = prompt.replace(/\n{2,}/g, '\n');
  }
  if (context?.singleLine) {
    prompt = prompt.replace(/\n+/g, ' ').trim();
  }

  return prompt;
}

/**
 * Mirrors SillyTavern `getInstructStoppingSequences` (public/scripts/instruct-mode.js):
 * always includes `stopSequence`, adds the role sequences when
 * `sequencesAsStopStrings`, prepends `\n` when `wrap`, skips whitespace-only
 * entries, dedupes. `{{name}}` resolves to `defaultName`; other macros via
 * `substituteMacros` when `instruct.macro`.
 */
export function getInstructStoppingSequences(
  instruct: InstructSettings | undefined,
  macroCtx: MacroContext | undefined,
): string[] {
  const result: string[] = [];
  if (!instruct || !instruct.enabled) return result;

  const macroEnabled = instruct.macro === true;
  const wrap = instruct.wrap === true;
  const wrapSeq = (s: string): string => (wrap ? `\n${s}` : s);

  const addSeq = (raw: string | undefined, defaultName: string): void => {
    if (typeof raw !== 'string' || raw.length === 0) return;
    const named = raw.replace(/\{\{\s*name\s*\}\}/gi, defaultName);
    const resolved = macroEnabled
      ? substituteMacros(named, macroCtx ?? { userName: '', characterName: '' })
      : named;
    if (resolved.trim().length === 0) return;
    const wrapped = wrapSeq(resolved);
    if (!result.includes(wrapped)) result.push(wrapped);
  };

  addSeq(instruct.stopSequence, '');

  if (instruct.sequencesAsStopStrings) {
    addSeq(instruct.inputSequence, macroCtx?.userName ?? '');
    addSeq(instruct.outputSequence, macroCtx?.characterName ?? '');
    addSeq(instruct.firstOutputSequence, macroCtx?.characterName ?? '');
    addSeq(instruct.lastOutputSequence, macroCtx?.characterName ?? '');
    addSeq(instruct.systemSequence, 'System');
    addSeq(instruct.lastSystemSequence, 'System');
    addSeq(instruct.firstInputSequence, macroCtx?.userName ?? '');
    addSeq(instruct.lastInputSequence, macroCtx?.userName ?? '');
  }

  return result;
}

/** Tail-trim any stop string (or its partial prefix) from `text`, matching
 *  SillyTavern `cleanUpMessage` lines 6410-6419 of public/script.js. */
export function trimStopStringTail(text: string, stops: string[] | undefined): string {
  if (!text || !stops || stops.length === 0) return text;
  let out = text;
  for (const stop of stops) {
    if (!stop || stop.length === 0) continue;
    for (let j = stop.length; j > 0; j--) {
      if (out.slice(-j) === stop.slice(0, j)) {
        out = out.slice(0, -j);
        break;
      }
    }
  }
  return out;
}

/**
 * Stream a text-completion request. Text-completion upstreams (llama.cpp, ooba,
 * etc.) return NDJSON lines, NOT SSE. Each line is a JSON object with a
 * `content` or `text` field containing the token.
 */
export async function* streamTextCompletion(
  request: StreamTextCompletionRequest,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  if (request.streaming === false) {
    let res: Response;
    try {
      res = await fetch(`${BASE}/ai/1.1/api/openai/text/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      throw err;
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      throw new Error(
        `streamTextCompletion non-streaming request failed (${res.status}): ${errText}`,
      );
    }
    const data = (await res.json()) as Record<string, unknown>;
    const content =
      (data.content as string) || (data.text as string) || (data.result as string) || '';
    if (content) yield content;
    return;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}/ai/1.1/api/openai/text/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    throw err;
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`streamTextCompletion SSE request failed (${res.status}): ${errText}`);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const data = (await res.json()) as { error?: { message?: string } };
    if (data.error?.message) {
      throw new Error(`streamTextCompletion upstream error: ${data.error.message}`);
    }
    throw new Error('streamTextCompletion received JSON instead of SSE stream');
  }

  if (!res.body) {
    throw new Error('No stream body');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  // Tail-trim partial stop-string prefixes per chunk and short-circuit when a
  // full stop matches. Needed because llama.cpp's server-side stop matching on
  // the token stream can fall behind the rendered text when skip_special_tokens
  // strips the special tokens composing a multi-token stop string (e.g.
  // "<|turn>model\n" decodes as "model\n" — server-side stop may not fire). The
  // tail trim is the safety net that keeps partial fragments like "<|turn>m"
  // from flashing in the UI. Mirrors SillyTavern cleanUpMessage
  // (public/script.js:6410-6419).
  const stops = Array.isArray(request.stop) ? request.stop : undefined;

  try {
    let buffer = '';
    let accumulated = '';
    let emitted = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        let trimmed = line.trim();
        if (!trimmed) continue;
        // Skip SSE comment frames (`:`) and non-data fields (event:, id:,
        // retry:) — only `data:` carries a payload. llama.cpp emits `:` keep-alive
        // comments during slow generations; JSON.parse on those threw the
        // "Unexpected token ':' is not valid JSON" warnings and stalled the
        // text-completion dripper behind the parse-error branch.
        if (trimmed.startsWith(':') || trimmed.startsWith('event:')) continue;
        if (trimmed.startsWith('id:') || trimmed.startsWith('retry:')) continue;
        if (trimmed.startsWith('data: ')) trimmed = trimmed.slice(6);
        else if (trimmed.startsWith('data:')) trimmed = trimmed.slice(5);
        if (trimmed === '[DONE]') return;
        if (!trimmed.startsWith('{')) continue;

        try {
          const parsed = JSON.parse(trimmed) as Record<string, unknown>;
          const content =
            (parsed.content as string) ||
            (parsed.text as string) ||
            (parsed.result as string) ||
            '';
          if (!content) continue;
          if (stops) {
            accumulated = trimStopStringTail(accumulated + content, stops);
            if (accumulated.length > emitted) {
              yield accumulated.slice(emitted);
              emitted = accumulated.length;
            }
            if (stops.some((s) => accumulated.endsWith(s))) return;
          } else {
            yield content;
          }
        } catch (err) {
          console.warn('[streamTextCompletion] parse error:', err);
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
          if (!content) return;
          if (stops) {
            accumulated = trimStopStringTail(accumulated + content, stops);
            if (accumulated.length > emitted) {
              yield accumulated.slice(emitted);
              emitted = accumulated.length;
            }
          } else {
            yield content;
          }
        } catch {
          // skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* streamChat(
  request: StreamChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  // Non-streaming transport: server returns one whole JSON response.
  // Validate before parsing so 4xx/5xx surfaces as an error instead of an empty message.
  if (request.streaming === false) {
    let res: Response;
    try {
      res = await fetch(`${BASE}/ai/1.1/api/openai/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      throw err;
    }
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

  let res: Response;
  try {
    res = await fetch(`${BASE}/ai/1.1/api/openai/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    throw err;
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`streamChat SSE request failed (${res.status}): ${errText}`);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    const data = (await res.json()) as { error?: { message?: string } };
    if (data.error?.message) {
      throw new Error(`streamChat upstream error: ${data.error.message}`);
    }
    throw new Error('streamChat received JSON instead of SSE stream');
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
        } catch (err) {
          console.warn('[streamChat] parse error:', err);
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

export async function getServerConfig(): Promise<{ host: string }> {
  return await apiGet<{ host: string }>('/server-config/get');
}

export async function updateServerConfig(host: string): Promise<{ ok: boolean; message: string }> {
  return await apiPost<{ ok: boolean; message: string }>('/server-config/update', { host });
}
