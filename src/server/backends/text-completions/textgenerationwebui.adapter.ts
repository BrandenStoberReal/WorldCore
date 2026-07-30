import type { TextCompletionAdapter } from './types';
import type { TextCompletionRequest } from '@/shared/types/backends/textcompletions';

export class TextGenerationWebUIAdapter implements TextCompletionAdapter {
  source = 'textgenerationwebui' as const;

  async forwardRequest(req: TextCompletionRequest): Promise<Response> {
    const url = (req.reverse_proxy as string | undefined) || 'http://127.0.0.1:5000';

    return fetch(`${url}/v1/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getKey(req)}`,
      },
      body: JSON.stringify({
        model: req.model,
        prompt: req.prompt,
        max_tokens: req.max_length,
        temperature: req.temperature,
        top_p: req.top_p,
        top_k: req.top_k,
        min_p: req.min_p,
        typical_p: req.typical_p,
        tfs_z: req.tfs,
        top_a: req.top_a,
        repeat_penalty: req.rep_pen,
        repeat_last_n: req.rep_pen_range,
        mirostat_mode: req.mirostat_mode,
        mirostat_tau: req.mirostat_tau,
        mirostat_eta: req.mirostat_eta,
        seed: req.seed,
        stop: req.stop,
        epsilon_cutoff: req.epsilon_cutoff,
        eta_cutoff: req.eta_cutoff,
        frequency_penalty: req.frequency_penalty,
        presence_penalty: req.presence_penalty,
        max_context_length: req.max_context,
        stream: req.streaming !== false,
      }),
      signal: req.signal as AbortSignal | undefined,
    });
  }

  private getKey(req: TextCompletionRequest): string {
    return (req.api_key as string | undefined) || '';
  }
}
