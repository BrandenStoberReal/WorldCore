import type { ChatCompletionAdapter } from './types';
import type { ChatCompletionRequest } from '@/shared/types/backends/chatcompletions';
import { convertXAIMessages } from './prompt-converters';

export class XAIAdapter implements ChatCompletionAdapter {
  source = 'xai' as const;

  async forwardRequest(req: ChatCompletionRequest): Promise<Response> {
    const url = (req.reverse_proxy as string | undefined) || 'https://api.x.ai/v1/chat/completions';

    const messages = convertXAIMessages(req.messages);

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getKey(req)}`,
      },
      body: JSON.stringify({
        model: req.model,
        messages,
        stream: req.stream,
        temperature: req.temperature,
        max_tokens: req.max_tokens,
        top_p: req.top_p,
        stop: req.stop,
      }),
      signal: req.signal as AbortSignal | undefined,
    });
  }

  private getKey(req: ChatCompletionRequest): string {
    return (req.api_key as string | undefined) || '';
  }
}
