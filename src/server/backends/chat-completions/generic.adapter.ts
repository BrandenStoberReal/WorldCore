import type { ChatCompletionAdapter } from './types';
import type {
  ChatCompletionRequest,
  ChatCompletionSource,
} from '@/shared/types/backends/chatcompletions';

function extractText(content: string | Array<{ text: string } | Record<string, unknown>>): string {
  if (typeof content === 'string') return content;
  return content
    .filter((c): c is { text: string } => 'text' in c)
    .map((c) => c.text)
    .join('\n');
}

export class GenericAdapter implements ChatCompletionAdapter {
  source: ChatCompletionSource;

  constructor(source: ChatCompletionSource) {
    this.source = source;
  }

  async forwardRequest(req: ChatCompletionRequest): Promise<Response> {
    const url = (req.reverse_proxy as string | undefined) || this.getDefaultUrl();

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getKey(req)}`,
      },
      body: JSON.stringify({
        model: req.model,
        messages: req.messages.map((m) => ({
          role: m.role,
          content: extractText(m.content),
        })),
        stream: req.stream,
        temperature: req.temperature,
        max_tokens: req.max_tokens,
        top_p: req.top_p,
      }),
      signal: req.signal as AbortSignal | undefined,
    });
  }

  private getDefaultUrl(): string {
    const urls: Record<string, string> = {
      mistralai: 'https://api.mistral.ai/v1/chat/completions',
      cohere: 'https://api.cohere.ai/v1/chat',
      groq: 'https://api.groq.com/openai/v1/chat/completions',
      deepseek: 'https://api.deepseek.com/v1/chat/completions',
      fireworks: 'https://api.fireworks.ai/inference/v1/chat/completions',
      perplexity: 'https://api.perplexity.ai/chat/completions',
      ai21: 'https://api.ai21.com/studio/v1/chat/completions',
      xai: 'https://api.x.ai/v1/chat/completions',
      minimax: 'https://api.minimax.chat/v1/chat/completions',
    };
    return urls[this.source] || 'https://api.openai.com/v1/chat/completions';
  }

  private getKey(req: ChatCompletionRequest): string {
    return (req.api_key as string | undefined) || '';
  }
}
