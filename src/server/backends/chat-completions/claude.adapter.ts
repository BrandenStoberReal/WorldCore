import type { ChatCompletionAdapter } from './types';
import type { ChatCompletionRequest } from '@/shared/types/backends/chatcompletions';
import { convertClaudeMessages } from './prompt-converters';

export class ClaudeAdapter implements ChatCompletionAdapter {
  source = 'claude' as const;

  async forwardRequest(req: ChatCompletionRequest): Promise<Response> {
    const { system, messages } = convertClaudeMessages(req.messages);

    const body: Record<string, unknown> = {
      model: req.model,
      system,
      messages,
      stream: req.stream,
      temperature: req.temperature,
      max_tokens: req.max_tokens,
      top_p: req.top_p,
    };

    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.getKey(req),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: req.signal as AbortSignal | undefined,
    });
  }

  private getKey(req: ChatCompletionRequest): string {
    return (req.api_key as string | undefined) || '';
  }
}
