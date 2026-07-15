import type { TextCompletionAdapter } from './types';
import type { TextCompletionRequest } from '@/shared/types/backends/textcompletions';

export class FeatherlessAdapter implements TextCompletionAdapter {
  source = 'featherless' as const;

  async forwardRequest(req: TextCompletionRequest): Promise<Response> {
    const url = (req.reverse_proxy as string | undefined) || 'http://127.0.0.1:5001';

    const body: Record<string, unknown> = {
      prompt: req.prompt,
      max_length: req.max_length,
      temperature: req.temperature,
      top_p: req.top_p,
      top_k: req.top_k,
      min_p: req.min_p,
      typical_p: req.typical_p,
      rep_pen: req.rep_pen,
      rep_pen_range: req.rep_pen_range,
      tfs: req.tfs,
      top_a: req.top_a,
      epsilon_cutoff: req.epsilon_cutoff,
      eta_cutoff: req.eta_cutoff,
      stop_sequences: req.stop,
    };

    return fetch(`${url}/api/v1/generate`, {
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
