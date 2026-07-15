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
