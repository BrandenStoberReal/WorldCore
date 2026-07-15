import type { ChatCompletionAdapter } from './types';
import type { ChatCompletionRequest } from '@/shared/types/backends/chatcompletions';

export class AI21Adapter implements ChatCompletionAdapter {
  source = 'ai21' as const;

  async forwardRequest(req: ChatCompletionRequest): Promise<Response> {
    const url =
      (req.reverse_proxy as string | undefined) ||
      'https://api.ai21.com/studio/v1/chat/completions';

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getKey(req)}`,
      },
      body: JSON.stringify({
        model: req.model,
        messages: req.messages,
        stream: req.stream,
        temperature: req.temperature,
        max_tokens: req.max_tokens,
        top_p: req.top_p,
        frequency_penalty: req.frequency_penalty,
        presence_penalty: req.presence_penalty,
        stop: req.stop,
      }),
      signal: req.signal as AbortSignal | undefined,
    });
  }

  private getKey(req: ChatCompletionRequest): string {
    return (req.api_key as string | undefined) || '';
  }
}
