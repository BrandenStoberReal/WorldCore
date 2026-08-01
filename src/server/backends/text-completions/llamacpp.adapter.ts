import type { TextCompletionAdapter } from './types';
import type { TextCompletionRequest } from '@/shared/types/backends/textcompletions';

const DEFAULT_SAMPLERS = [
  'penalties',
  'dry',
  'top_n_sigma',
  'top_k',
  'typ_p',
  'top_p',
  'min_p',
  'xtc',
  'temperature',
  'adaptive_p',
];

export class LlamaCppAdapter implements TextCompletionAdapter {
  source = 'llamacpp' as const;

  async forwardRequest(req: TextCompletionRequest): Promise<Response> {
    const url = (req.reverse_proxy as string | undefined) || 'http://127.0.0.1:8080';

    const r = req as unknown as Record<string, unknown>;
    const num = (key: string): number | undefined => {
      const v = r[key];
      return typeof v === 'number' ? v : undefined;
    };

    const body: Record<string, unknown> = {};
    if (req.model) body.model = req.model;
    if (req.prompt) body.prompt = req.prompt;
    if (req.max_length) body.n_predict = req.max_length;
    else if (req.max_tokens) body.n_predict = req.max_tokens;
    if (req.max_context) body.n_ctx = req.max_context;

    body.samplers = req.samplers ?? DEFAULT_SAMPLERS;

    if (req.temperature !== undefined) body.temperature = req.temperature;
    if (req.top_p !== undefined) body.top_p = req.top_p;
    if (req.top_k !== undefined) body.top_k = req.top_k;
    if (req.min_p !== undefined) body.min_p = req.min_p;
    if (req.typical_p !== undefined) body.typical_p = req.typical_p;
    if (req.tfs !== undefined) body.tfs_z = req.tfs;
    if (req.top_a !== undefined) body.top_a = req.top_a;

    if (req.rep_pen !== undefined) body.repeat_penalty = req.rep_pen;
    if (req.rep_pen_range !== undefined) body.repeat_last_n = req.rep_pen_range;
    if (req.rep_pen_slope !== undefined) body.repeat_penalty_decay = req.rep_pen_slope;

    if (req.dry_multiplier !== undefined) body.dry_multiplier = req.dry_multiplier;
    if (req.dry_base !== undefined) body.dry_base = req.dry_base;
    if (req.dry_allowed_length !== undefined) body.dry_allowed_length = req.dry_allowed_length;

    if (req.mirostat_mode !== undefined) body.mirostat = req.mirostat_mode;
    if (req.mirostat_tau !== undefined) body.mirostat_tau = req.mirostat_tau;
    if (req.mirostat_eta !== undefined) body.mirostat_eta = req.mirostat_eta;

    if (req.smoothing_factor !== undefined) body.smoothing_factor = req.smoothing_factor;
    if (req.epsilon_cutoff !== undefined) body.epsilon_cutoff = req.epsilon_cutoff;
    if (req.eta_cutoff !== undefined) body.eta_cutoff = req.eta_cutoff;
    if (req.min_tokens !== undefined) body.min_tokens = req.min_tokens;
    if (req.skip_special_tokens !== undefined) body.skip_special_tokens = req.skip_special_tokens;
    if (req.add_bos_token !== undefined) body.add_bos_token = req.add_bos_token;
    if (req.ban_eos_token !== undefined) body.ban_eos_token = req.ban_eos_token;
    if (req.seed !== undefined) body.seed = req.seed;
    if (req.stop) body.stop = req.stop;

    const smoothingCurve = num('smoothing_curve');
    if (smoothingCurve !== undefined) body.smoothing_curve = smoothingCurve;
    const repPenDecay = num('rep_pen_decay');
    if (repPenDecay !== undefined) body.repeat_penalty_decay = repPenDecay;
    const dryPenaltyLastN = num('dry_penalty_last_n');
    if (dryPenaltyLastN !== undefined) body.dry_penalty_last_n = dryPenaltyLastN;
    const minTemp = num('min_temp');
    if (minTemp !== undefined) body.min_temp = minTemp;
    const maxTemp = num('max_temp');
    if (maxTemp !== undefined) body.max_temp = maxTemp;
    const dynatempExponent = num('dynatemp_exponent');
    if (dynatempExponent !== undefined) body.dynatemp_exponent = dynatempExponent;
    const penaltyAlpha = num('penalty_alpha');
    if (penaltyAlpha !== undefined) body.penalty_alpha = penaltyAlpha;
    const numBeams = num('num_beams');
    if (numBeams !== undefined) body.num_beams = numBeams;
    const lengthPenalty = num('length_penalty');
    if (lengthPenalty !== undefined) body.length_penalty = lengthPenalty;
    const minLength = num('min_length');
    if (minLength !== undefined) body.min_length = minLength;
    const encoderRepPen = num('encoder_rep_pen');
    if (encoderRepPen !== undefined) body.encoder_rep_pen = encoderRepPen;
    const skew = num('skew');
    if (skew !== undefined) body.skew = skew;
    const xtcThreshold = num('xtc_threshold');
    if (xtcThreshold !== undefined) body.xtc_threshold = xtcThreshold;
    const xtcProbability = num('xtc_probability');
    if (xtcProbability !== undefined) body.xtc_probability = xtcProbability;
    const nsigma = num('nsigma');
    if (nsigma !== undefined) body.nsigma = nsigma;
    const minKeep = num('min_keep');
    if (minKeep !== undefined) body.min_keep = minKeep;
    const repPenSize = num('rep_pen_size');
    if (repPenSize !== undefined) body.rep_pen_size = repPenSize;
    const adaptiveTarget = num('adaptive_target');
    if (adaptiveTarget !== undefined) body.adaptive_target = adaptiveTarget;
    const adaptiveDecay = num('adaptive_decay');
    if (adaptiveDecay !== undefined) body.adaptive_decay = adaptiveDecay;

    const samplerPriority = r.sampler_priority;
    if (Array.isArray(samplerPriority)) body.sampler_priority = samplerPriority;
    const samplersPriorities = r.samplers_priorities;
    if (Array.isArray(samplersPriorities)) body.samplers_priorities = samplersPriorities;

    const drySeqBreakers = r.dry_sequence_breakers;
    if (typeof drySeqBreakers === 'string' && drySeqBreakers.length > 0) {
      try {
        const parsed = JSON.parse(drySeqBreakers);
        if (Array.isArray(parsed) && parsed.every((s: unknown) => typeof s === 'string')) {
          body.dry_sequence_breakers = parsed;
        }
      } catch {
        body.dry_sequence_breakers = [drySeqBreakers];
      }
    } else if (
      Array.isArray(drySeqBreakers) &&
      drySeqBreakers.every((s: unknown) => typeof s === 'string')
    ) {
      body.dry_sequence_breakers = drySeqBreakers;
    }

    body.stream = req.streaming !== false;

    console.log('=== LLAMACPP BODY ===');
    console.log(JSON.stringify(body, null, 2));
    console.log('=== END LLAMACPP BODY ===');

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
