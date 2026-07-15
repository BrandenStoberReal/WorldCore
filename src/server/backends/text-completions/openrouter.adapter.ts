import type { TextCompletionAdapter } from './types';
import type { TextCompletionRequest } from '@/shared/types/backends/textcompletions';

export class OpenRouterAdapter implements TextCompletionAdapter {
  source = 'openrouter' as const;

  async forwardRequest(req: TextCompletionRequest): Promise<Response> {
    const url =
      (req.reverse_proxy as string | undefined) || 'https://openrouter.ai/api/v1/completions';

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getKey(req)}`,
        'HTTP-Referer': 'http://WorldCore.local',
        'X-Title': 'WorldCore',
      },
      body: JSON.stringify({
        model: req.model,
        prompt: req.prompt,
        temperature: req.temperature,
        max_tokens: req.max_length,
        top_p: req.top_p,
        top_k: req.top_k,
        stop: req.stop,
        frequency_penalty: req.frequency_penalty,
        presence_penalty: req.presence_penalty,
      }),
      signal: req.signal as AbortSignal | undefined,
    });
  }

  private getKey(req: TextCompletionRequest): string {
    return (req.api_key as string | undefined) || '';
  }
}
