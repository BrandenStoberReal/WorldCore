import type { ChatCompletionAdapter } from './types';
import type { ChatCompletionRequest } from '@/shared/types/backends/chatcompletions';

export class MoonshotAdapter implements ChatCompletionAdapter {
  source = 'moonshot' as const;

  async forwardRequest(req: ChatCompletionRequest): Promise<Response> {
    const url =
      (req.reverse_proxy as string | undefined) || 'https://api.moonshot.cn/v1/chat/completions';

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
      top_p: req.top_p,
      stop: req.stop,
    };

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getKey(req)}`,
      },
      body: JSON.stringify(body),
      signal: req.signal as AbortSignal | undefined,
    });
  }

  private getKey(req: ChatCompletionRequest): string {
    return (req.api_key as string | undefined) || '';
  }
}
