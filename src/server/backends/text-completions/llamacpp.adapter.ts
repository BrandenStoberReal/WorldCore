import type { TextCompletionAdapter } from './types';
import type { TextCompletionRequest } from '@/shared/types/backends/textcompletions';

export class LlamaCppAdapter implements TextCompletionAdapter {
  source = 'llamacpp' as const;

  async forwardRequest(req: TextCompletionRequest): Promise<Response> {
    const url = (req.reverse_proxy as string | undefined) || 'http://127.0.0.1:8080';

    const body: Record<string, unknown> = {
      prompt: req.prompt,
      max_tokens: req.max_length,
      temperature: req.temperature,
      top_p: req.top_p,
      top_k: req.top_k,
      stop: req.stop,
      repeat_penalty: req.rep_pen,
    };

    return fetch(`${url}/completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getKey(req)}`,
      },
      body: JSON.stringify(body),
      signal: req.signal as AbortSignal | undefined,
    });
  }

  private getKey(req: TextCompletionRequest): string {
    return (req.api_key as string | undefined) || '';
  }
}
