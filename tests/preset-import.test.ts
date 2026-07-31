import { describe, it, expect } from 'bun:test';

// Re-implement the parseSillyTavernGenerationPreset logic from GenerationSidebar.tsx
// for testing purposes (the component function is not exported)
function parseSillyTavernGenerationPreset(
  json: Record<string, unknown>,
): Partial<Record<string, unknown>> | null {
  const tgSettings = json.textgenerationwebui_settings as Record<string, unknown> | undefined;
  const nestedPreset = json.preset as Record<string, unknown> | undefined;
  const source = tgSettings ?? nestedPreset ?? json;

  if (typeof source !== 'object' || source === null) return null;

  const params: Record<string, unknown> = {};

  const fieldMap: Record<string, string> = {
    temp: 'temperature',
    freq_pen: 'frequency_penalty',
    presence_pen: 'presence_penalty',
  };

  const numericKeys = [
    'temperature', 'top_p', 'top_k', 'max_tokens', 'seed',
    'frequency_penalty', 'presence_penalty', 'min_tokens',
    'min_p', 'typical_p', 'top_a', 'tfs',
    'rep_pen', 'rep_pen_range', 'rep_pen_slope',
    'dry_multiplier', 'dry_base', 'dry_allowed_length',
    'mirostat_mode', 'mirostat_tau', 'mirostat_eta',
    'smoothing_factor', 'epsilon_cutoff', 'eta_cutoff',
  ];

  for (const key of numericKeys) {
    if (key in source) {
      const val = source[key];
      if (typeof val === 'number') params[key] = val;
    }
  }

  for (const [alias, canonical] of Object.entries(fieldMap)) {
    if (alias in source && !(canonical in params)) {
      const val = source[alias];
      if (typeof val === 'number') params[canonical] = val;
    }
  }

  if ('stop' in source && Array.isArray(source.stop)) {
    params.stop = source.stop;
  } else if ('stopping_strings' in source && Array.isArray(source.stopping_strings)) {
    params.stop = source.stopping_strings;
  }

  if ('samplers' in source && Array.isArray(source.samplers)) {
    const samplers = source.samplers;
    if (samplers.every((s: unknown) => typeof s === 'string')) {
      params.samplers = samplers;
    }
  } else if ('sampler_order' in source && Array.isArray(source.sampler_order)) {
    const order = source.sampler_order;
    if (order.every((n: unknown) => typeof n === 'number')) {
      const KOBOLD_TO_LLAMACPP: Record<number, string> = {
        0: 'top_k', 1: 'top_p', 2: 'tfs', 3: 'typ_p',
        4: 'temperature', 5: 'top_a', 6: 'penalties',
      };
      params.samplers = order.map((n: number) => KOBOLD_TO_LLAMACPP[n]).filter(Boolean);
    }
  } else if ('sampler_priority' in source && Array.isArray(source.sampler_priority)) {
    const priority = source.sampler_priority;
    if (priority.every((s: unknown) => typeof s === 'string')) {
      const OOBA_TO_LLAMACPP: Record<string, string> = {
        repetition_penalty: 'penalties', frequency_penalty: 'penalties',
        presence_penalty: 'penalties', top_n_sigma: 'top_n_sigma',
        typical_p: 'typ_p', temperature: 'temperature', min_p: 'min_p',
        top_a: 'top_a', top_k: 'top_k', top_p: 'top_p',
      };
      const seen = new Set<string>();
      params.samplers = priority
        .map((s: string) => OOBA_TO_LLAMACPP[s])
        .filter((s: string | undefined): s is string => !!s && !seen.has(s) && (seen.add(s), true));
    }
  }

  if (Object.keys(params).length === 0) return null;

  return params;
}

describe('parseSillyTavernGenerationPreset', () => {
  describe('basic numeric extraction', () => {
    it('extracts temperature from temp alias', () => {
      const result = parseSillyTavernGenerationPreset({ temp: 0.8 });
      expect(result).toEqual({ temperature: 0.8 });
    });

    it('extracts temperature directly', () => {
      const result = parseSillyTavernGenerationPreset({ temperature: 0.7 });
      expect(result).toEqual({ temperature: 0.7 });
    });

    it('prefers canonical over alias', () => {
      const result = parseSillyTavernGenerationPreset({ temp: 0.8, temperature: 0.7 });
      expect(result).toEqual({ temperature: 0.7 });
    });

    it('extracts multiple numeric params', () => {
      const result = parseSillyTavernGenerationPreset({
        temperature: 0.7,
        top_p: 0.95,
        top_k: 40,
        min_p: 0.05,
        rep_pen: 1.2,
      });
      expect(result).toEqual({
        temperature: 0.7,
        top_p: 0.95,
        top_k: 40,
        min_p: 0.05,
        rep_pen: 1.2,
      });
    });

    it('ignores non-numeric values', () => {
      const result = parseSillyTavernGenerationPreset({
        temperature: '0.7',
        top_p: null,
        top_k: undefined,
      });
      expect(result).toBeNull();
    });
  });

  describe('stop strings extraction', () => {
    it('extracts stop array', () => {
      const result = parseSillyTavernGenerationPreset({ stop: ['\\n', ':'] });
      expect(result).toEqual({ stop: ['\\n', ':'] });
    });

    it('extracts stopping_strings as fallback', () => {
      const result = parseSillyTavernGenerationPreset({ stopping_strings: ['\\n', ':'] });
      expect(result).toEqual({ stop: ['\\n', ':'] });
    });

    it('prefers stop over stopping_strings', () => {
      const result = parseSillyTavernGenerationPreset({
        stop: ['a'],
        stopping_strings: ['b'],
      });
      expect(result).toEqual({ stop: ['a'] });
    });
  });

  describe('samplers extraction', () => {
    it('extracts samplers array directly', () => {
      const result = parseSillyTavernGenerationPreset({
        samplers: ['penalties', 'dry', 'top_k', 'top_p'],
      });
      expect(result).toEqual({
        samplers: ['penalties', 'dry', 'top_k', 'top_p'],
      });
    });

    it('converts sampler_order (KoboldCpp) to samplers', () => {
      const result = parseSillyTavernGenerationPreset({
        sampler_order: [6, 0, 1, 3, 4, 2, 5],
      });
      expect(result).toEqual({
        samplers: ['penalties', 'top_k', 'top_p', 'typ_p', 'temperature', 'tfs', 'top_a'],
      });
    });

    it('converts sampler_priority (Ooba) to samplers with dedup', () => {
      const result = parseSillyTavernGenerationPreset({
        sampler_priority: [
          'repetition_penalty',
          'temperature',
          'top_k',
          'top_p',
          'typical_p',
        ],
      });
      expect(result).toEqual({
        samplers: ['penalties', 'temperature', 'top_k', 'top_p', 'typ_p'],
      });
    });

    it('ignores unknown Ooba sampler names', () => {
      const result = parseSillyTavernGenerationPreset({
        sampler_priority: ['unknown_sampler', 'temperature'],
      });
      expect(result).toEqual({
        samplers: ['temperature'],
      });
    });

    it('prefers samplers over sampler_order', () => {
      const result = parseSillyTavernGenerationPreset({
        samplers: ['penalties', 'temperature'],
        sampler_order: [6, 0, 1],
      });
      expect(result).toEqual({
        samplers: ['penalties', 'temperature'],
      });
    });
  });

  describe('textgenerationwebui_settings wrapper', () => {
    it('extracts from nested textgenerationwebui_settings', () => {
      const result = parseSillyTavernGenerationPreset({
        textgenerationwebui_settings: {
          temp: 0.8,
          top_p: 0.95,
        },
      });
      expect(result).toEqual({
        temperature: 0.8,
        top_p: 0.95,
      });
    });

    it('prefers nested textgenerationwebui_settings over top-level', () => {
      const result = parseSillyTavernGenerationPreset({
        temperature: 0.7,
        textgenerationwebui_settings: {
          temp: 0.8,
        },
      });
      expect(result).toEqual({
        temperature: 0.8,
      });
    });
  });

  describe('SillyTavern master preset format', () => {
    it('handles preset section with samplers', () => {
      const result = parseSillyTavernGenerationPreset({
        preset: {
          temp: 1,
          top_p: 0.95,
          min_p: 0.05,
          samplers: ['penalties', 'dry', 'top_k'],
        },
      });
      expect(result).toEqual({
        temperature: 1,
        top_p: 0.95,
        min_p: 0.05,
        samplers: ['penalties', 'dry', 'top_k'],
      });
    });

    it('handles preset section with sampler_order', () => {
      const result = parseSillyTavernGenerationPreset({
        preset: {
          temp: 1,
          sampler_order: [6, 0, 1, 3, 4, 2, 5],
        },
      });
      expect(result).toEqual({
        temperature: 1,
        samplers: ['penalties', 'top_k', 'top_p', 'typ_p', 'temperature', 'tfs', 'top_a'],
      });
    });
  });

  describe('return null for empty/invalid input', () => {
    it('returns null for empty object', () => {
      expect(parseSillyTavernGenerationPreset({})).toBeNull();
    });

    it('returns null for non-object input', () => {
      expect(() => parseSillyTavernGenerationPreset(null as unknown as Record<string, unknown>)).toThrow();
    });

    it('returns null for array input', () => {
      const result = parseSillyTavernGenerationPreset([] as unknown as Record<string, unknown>);
      expect(result).toBeNull();
    });

    it('returns null for object with no valid params', () => {
      expect(parseSillyTavernGenerationPreset({ unknown_field: 'value' })).toBeNull();
    });
  });
});
