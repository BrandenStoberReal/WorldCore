import type { TextCompletionAdapter } from './types';
import type { TextCompletionRequest } from '@/shared/types/backends/textcompletions';

export class OobaAdapter implements TextCompletionAdapter {
  source = 'ooba' as const;

  async forwardRequest(req: TextCompletionRequest): Promise<Response> {
    const url = (req.reverse_proxy as string | undefined) || 'http://127.0.0.1:5000';

    const r = req as unknown as Record<string, unknown>;
    const num = (key: string): number | undefined => {
      const v = r[key];
      return typeof v === 'number' ? v : undefined;
    };
    const bool = (key: string): boolean | undefined => {
      const v = r[key];
      return typeof v === 'boolean' ? v : undefined;
    };
    const str = (key: string): string | undefined => {
      const v = r[key];
      return typeof v === 'string' ? v : undefined;
    };

    const body: Record<string, unknown> = {
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
    };

    const smoothingFactor = num('smoothing_factor');
    if (smoothingFactor !== undefined) body.smoothing_factor = smoothingFactor;
    const smoothingCurve = num('smoothing_curve');
    if (smoothingCurve !== undefined) body.smoothing_curve = smoothingCurve;
    const encoderRepPen = num('encoder_rep_pen');
    if (encoderRepPen !== undefined) body.encoder_rep_pen = encoderRepPen;
    const skew = num('skew');
    if (skew !== undefined) body.skew = skew;
    const noRepeatNgramSize = num('no_repeat_ngram_size');
    if (noRepeatNgramSize !== undefined) body.no_repeat_ngram_size = noRepeatNgramSize;
    const penaltyAlpha = num('penalty_alpha');
    if (penaltyAlpha !== undefined) body.penalty_alpha = penaltyAlpha;
    const numBeams = num('num_beams');
    if (numBeams !== undefined) body.num_beams = numBeams;
    const lengthPenalty = num('length_penalty');
    if (lengthPenalty !== undefined) body.length_penalty = lengthPenalty;
    const minLength = num('min_length');
    if (minLength !== undefined) body.min_length = minLength;
    const dynatemp = num('dynatemp');
    if (dynatemp !== undefined) body.dynatemp = dynatemp;
    const minTemp = num('min_temp');
    if (minTemp !== undefined) body.min_temp = minTemp;
    const maxTemp = num('max_temp');
    if (maxTemp !== undefined) body.max_temp = maxTemp;
    const dynatempExponent = num('dynatemp_exponent');
    if (dynatempExponent !== undefined) body.dynatemp_exponent = dynatempExponent;
    const temperatureLast = bool('temperature_last');
    if (temperatureLast !== undefined) body.temperature_last = temperatureLast;
    const doSample = bool('do_sample');
    if (doSample !== undefined) body.do_sample = doSample;
    const earlyStopping = bool('early_stopping');
    if (earlyStopping !== undefined) body.early_stopping = earlyStopping;
    const addBosToken = bool('add_bos_token');
    if (addBosToken !== undefined) body.add_bos_token = addBosToken;
    const banEosToken = bool('ban_eos_token');
    if (banEosToken !== undefined) body.ban_eos_token = banEosToken;
    const skipSpecialTokens = bool('skip_special_tokens');
    if (skipSpecialTokens !== undefined) body.skip_special_tokens = skipSpecialTokens;
    const ignoreEosToken = bool('ignore_eos_token');
    if (ignoreEosToken !== undefined) body.ignore_eos_token = ignoreEosToken;
    const spacesBetweenSpecialTokens = bool('spaces_between_special_tokens');
    if (spacesBetweenSpecialTokens !== undefined) {
      body.spaces_between_special_tokens = spacesBetweenSpecialTokens;
    }
    const grammarString = str('grammar_string');
    if (grammarString !== undefined) body.grammar_string = grammarString;
    const bannedTokens = r.banned_tokens;
    if (Array.isArray(bannedTokens)) body.banned_tokens = bannedTokens;
    const logitBias = r.logit_bias;
    if (Array.isArray(logitBias) || (typeof logitBias === 'object' && logitBias !== null)) {
      body.logit_bias = logitBias;
    }
    const xtcThreshold = num('xtc_threshold');
    if (xtcThreshold !== undefined) body.xtc_threshold = xtcThreshold;
    const xtcProbability = num('xtc_probability');
    if (xtcProbability !== undefined) body.xtc_probability = xtcProbability;
    const negativePrompt = str('negative_prompt');
    if (negativePrompt !== undefined) body.negative_prompt = negativePrompt;
    const guidanceScale = num('guidance_scale');
    if (guidanceScale !== undefined) body.guidance_scale = guidanceScale;

    return fetch(`${url}/v1/completions`, {
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
