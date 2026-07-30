import type { TextCompletionAdapter } from './types';
import type { TextCompletionRequest } from '@/shared/types/backends/textcompletions';

export class LlamaCppAdapter implements TextCompletionAdapter {
  source = 'llamacpp' as const;

  async forwardRequest(req: TextCompletionRequest): Promise<Response> {
    const url = (req.reverse_proxy as string | undefined) || 'http://127.0.0.1:8080';

    const body: Record<string, unknown> = {};
    if (req.model) body.model = req.model;
    if (req.prompt) body.prompt = req.prompt;
    if (req.max_length) body.n_predict = req.max_length;
    if (req.temperature !== undefined) body.temperature = req.temperature;
    if (req.top_p !== undefined) body.top_p = req.top_p;
    if (req.top_k !== undefined) body.top_k = req.top_k;
    if (req.min_p !== undefined) body.min_p = req.min_p;
    if (req.typical_p !== undefined) body.typical_p = req.typical_p;
    if (req.tfs !== undefined) body.tfs_z = req.tfs;
    if (req.top_a !== undefined) body.top_a = req.top_a;
    if (req.rep_pen !== undefined) body.repeat_penalty = req.rep_pen;
    if (req.rep_pen_range !== undefined) body.repeat_last_n = req.rep_pen_range;
    if (req.mirostat_mode !== undefined) body.mirostat = req.mirostat_mode;
    if (req.mirostat_tau !== undefined) body.mirostat_tau = req.mirostat_tau;
    if (req.mirostat_eta !== undefined) body.mirostat_eta = req.mirostat_eta;
    if (req.seed !== undefined) body.seed = req.seed;
    if (req.stop) body.stop = req.stop;
    if (req.epsilon_cutoff !== undefined) body.epsilon_cutoff = req.epsilon_cutoff;
    if (req.eta_cutoff !== undefined) body.eta_cutoff = req.eta_cutoff;
    if (req.frequency_penalty !== undefined) body.frequency_penalty = req.frequency_penalty;
    if (req.presence_penalty !== undefined) body.presence_penalty = req.presence_penalty;
    body.stream = req.streaming !== false;

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
