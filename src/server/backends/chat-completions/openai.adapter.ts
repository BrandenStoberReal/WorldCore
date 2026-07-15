import type { ChatCompletionAdapter } from './types';
import type {
  ChatCompletionRequest,
  ChatCompletionSource,
} from '@/shared/types/backends/chatcompletions';

export class OpenAIAdapter implements ChatCompletionAdapter {
  source: ChatCompletionSource;

  constructor(source: ChatCompletionSource = 'openai') {
    this.source = source;
  }

  async forwardRequest(req: ChatCompletionRequest): Promise<Response> {
    const url =
      (req.reverse_proxy as string | undefined) || 'https://api.openai.com/v1/chat/completions';

    const body: Record<string, unknown> = {
      model: req.model,
      messages: req.messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.name && { name: m.name }),
      })),
      stream: req.stream,
      temperature: req.temperature,
      max_tokens: req.max_tokens,
      frequency_penalty: req.frequency_penalty,
      presence_penalty: req.presence_penalty,
      top_p: req.top_p,
      top_k: req.top_k,
      seed: req.seed,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.getKey(req)}`,
    };

    return fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: req.signal as AbortSignal | undefined,
    });
  }

  private getKey(req: ChatCompletionRequest): string {
    return (req.api_key as string | undefined) || '';
  }
}
