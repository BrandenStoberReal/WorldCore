import { describe, expect, it } from 'bun:test';
import { parseSillyTavernOptions } from '@/lib/parseSillyTavernOptions';

const GEMMA4_MASTER_PRESET = {
  instruct: {
    input_sequence: '<|turn>user\n',
    output_sequence: '<|turn>model\n',
    last_output_sequence: '<|turn>model\n',
    system_sequence: '<|turn>system\n',
    stop_sequence: '',
    wrap: false,
    macro: true,
    names_behavior: 'none',
    activation_regex: '',
    first_output_sequence: '',
    skip_examples: true,
    output_suffix: '<turn|>\n',
    input_suffix: '<turn|>\n',
    system_suffix: '<turn|>\n',
    user_alignment_message: '',
    system_same_as_user: false,
    last_system_sequence: '',
    first_input_sequence: '',
    last_input_sequence: '',
    sequences_as_stop_strings: true,
    story_string_prefix: '',
    story_string_suffix: '',
    name: 'Gemma4-Think',
  },
  context: {
    story_string:
      "<|turn>system\n<|think|>\n{{#if anchorBefore}}{{anchorBefore}}\n{{/if}}{{#if system}}{{system}}\n{{/if}}{{#if wiBefore}}{{wiBefore}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}'s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if wiAfter}}{{wiAfter}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}{{#if anchorAfter}}{{anchorAfter}}\n{{/if}}{{trim}}<turn|>\n",
    example_separator: '',
    chat_start: '',
    use_stop_strings: false,
    names_as_stop_strings: true,
    story_string_position: 0,
    story_string_depth: 1,
    story_string_role: 0,
    always_force_name2: false,
    trim_sentences: false,
    single_line: false,
    name: 'Gemma4-Think',
  },
  sysprompt: {
    name: 'Mistral-V7-Tekken-T8-XML-Abliterated',
    content: 'You are {{char}}, a sentient, emotional being acting with free will.',
    post_history: '',
    extensions: {},
  },
  preset: {
    temp: 1,
    temperature_last: true,
    top_p: 0.95,
    top_k: 0,
    top_a: 0,
    tfs: 1,
    epsilon_cutoff: 0,
    eta_cutoff: 0,
    typical_p: 1,
    min_p: 0.05,
    rep_pen: 1,
    rep_pen_range: 0,
    rep_pen_decay: 0,
    rep_pen_slope: 1,
    no_repeat_ngram_size: 0,
    penalty_alpha: 0,
    num_beams: 1,
    length_penalty: 1,
    min_length: 0,
    encoder_rep_pen: 1,
    freq_pen: 0,
    presence_pen: 0,
    skew: 0,
    do_sample: true,
    early_stopping: false,
    dynatemp: false,
    min_temp: 0,
    max_temp: 2,
    dynatemp_exponent: 1,
    smoothing_factor: 0,
    smoothing_curve: 1,
    dry_allowed_length: 2,
    dry_multiplier: 0,
    dry_base: 1.75,
    dry_sequence_breakers: '["\\n", ":", "\\"", "*"]',
    dry_penalty_last_n: 0,
    add_bos_token: true,
    ban_eos_token: false,
    skip_special_tokens: true,
    mirostat_mode: 0,
    mirostat_tau: 5,
    mirostat_eta: 0.1,
    guidance_scale: 1,
    negative_prompt: '',
    grammar_string: '',
    json_schema: null,
    json_schema_allow_empty: false,
    banned_tokens: '',
    sampler_priority: [
      'repetition_penalty',
      'presence_penalty',
      'frequency_penalty',
      'dry',
      'temperature',
      'dynamic_temperature',
      'quadratic_sampling',
      'top_n_sigma',
      'top_k',
      'top_p',
      'typical_p',
      'epsilon_cutoff',
      'eta_cutoff',
      'tfs',
      'top_a',
      'min_p',
      'adaptive_p',
      'mirostat',
      'xtc',
      'encoder_repetition_penalty',
      'no_repeat_ngram',
    ],
    samplers: [
      'penalties',
      'dry',
      'top_n_sigma',
      'top_k',
      'typ_p',
      'tfs_z',
      'typical_p',
      'xtc',
      'top_p',
      'adaptive_p',
      'min_p',
      'temperature',
    ],
    sampler_order: [6, 0, 1, 3, 4, 2, 5],
    logit_bias: [],
    xtc_threshold: 0.1,
    xtc_probability: 0,
    nsigma: 0,
    min_keep: 0,
    extensions: {},
    adaptive_target: -0.01,
    adaptive_decay: 0.9,
    rep_pen_size: 0,
    genamt: 4096,
    max_length: 64000,
    name: 'Default',
  },
  reasoning: {
    name: 'Gemma 4',
    prefix: '<|channel>thought\n',
    suffix: '<channel|>',
    separator: '\n\n',
  },
};

describe('parseSillyTavernOptions — Gemma4 master preset baseline', () => {
  const result = parseSillyTavernOptions(GEMMA4_MASTER_PRESET);

  describe('instruct', () => {
    it('parses input_sequence', () => {
      expect(result.instruct?.inputSequence).toBe('<|turn>user\n');
    });

    it('parses output_sequence', () => {
      expect(result.instruct?.outputSequence).toBe('<|turn>model\n');
    });

    it('parses last_output_sequence', () => {
      expect(result.instruct?.lastOutputSequence).toBe('<|turn>model\n');
    });

    it('parses system_sequence', () => {
      expect(result.instruct?.systemSequence).toBe('<|turn>system\n');
    });

    it('parses output_suffix', () => {
      expect(result.instruct?.outputSuffix).toBe('<turn|>\n');
    });

    it('parses input_suffix', () => {
      expect(result.instruct?.inputSuffix).toBe('<turn|>\n');
    });

    it('parses system_suffix', () => {
      expect(result.instruct?.systemSuffix).toBe('<turn|>\n');
    });

    it('parses wrap as false', () => {
      expect(result.instruct?.wrap).toBe(false);
    });

    it('parses macro as true', () => {
      expect(result.instruct?.macro).toBe(true);
    });

    it('parses skip_examples as true', () => {
      expect(result.instruct?.skipExamples).toBe(true);
    });

    it('parses names_behavior string "none"', () => {
      expect(result.instruct?.namesBehavior).toBe('none');
    });

    it('parses sequences_as_stop_strings as true', () => {
      expect(result.instruct?.sequencesAsStopStrings).toBe(true);
    });

    it('parses system_same_as_user as false', () => {
      expect(result.instruct?.systemSameAsUser).toBe(false);
    });

    it('parses stop_sequence (empty string stays empty)', () => {
      expect(result.instruct?.stopSequence).toBe('');
    });

    it('parses activation_regex (empty string)', () => {
      expect(result.instruct?.activationRegex).toBe('');
    });

    it('parses user_alignment_message (empty string)', () => {
      expect(result.instruct?.userAlignmentMessage).toBe('');
    });

    it('parses first_output_sequence (empty string)', () => {
      expect(result.instruct?.firstOutputSequence).toBe('');
    });

    it('parses last_system_sequence (empty string)', () => {
      expect(result.instruct?.lastSystemSequence).toBe('');
    });

    it('parses first_input_sequence (empty string)', () => {
      expect(result.instruct?.firstInputSequence).toBe('');
    });

    it('parses last_input_sequence (empty string)', () => {
      expect(result.instruct?.lastInputSequence).toBe('');
    });

    it('parses story_string_prefix (empty string)', () => {
      expect(result.instruct?.storyStringPrefix).toBe('');
    });

    it('parses story_string_suffix (empty string)', () => {
      expect(result.instruct?.storyStringSuffix).toBe('');
    });
  });

  describe('context', () => {
    it('parses story_string', () => {
      expect(result.context?.storyString).toContain('<|turn>system');
      expect(result.context?.storyString).toContain('{{char}}');
      expect(result.context?.storyString).toContain('<turn|>');
    });

    it('parses always_force_name2 as false', () => {
      expect(result.context?.forceName2).toBe(false);
    });

    it('parses use_stop_strings as false', () => {
      expect(result.context?.separatorsAsStopStrings).toBe(false);
    });

    it('parses names_as_stop_strings as true', () => {
      expect(result.context?.namesAsStopStrings).toBe(true);
    });

    it('parses story_string_position 0 as "default"', () => {
      expect(result.context?.storyStringPosition).toBe('default');
    });

    it('parses story_string_depth as 1', () => {
      expect(result.context?.storyStringDepth).toBe(1);
    });

    it('parses story_string_role 0 as "system"', () => {
      expect(result.context?.storyStringRole).toBe('system');
    });

    it('parses trim_sentences as false', () => {
      expect(result.context?.trimSentences).toBe(false);
    });

    it('parses single_line as false', () => {
      expect(result.context?.singleLine).toBe(false);
    });

    it('parses example_separator (empty string)', () => {
      expect(result.context?.exampleSeparator).toBe('');
    });

    it('parses chat_start (empty string)', () => {
      expect(result.context?.chatStart).toBe('');
    });
  });

  describe('sysprompt', () => {
    it('parses content', () => {
      expect(result.sysprompt?.content).toBe(
        'You are {{char}}, a sentient, emotional being acting with free will.',
      );
    });

    it('parses post_history (empty string)', () => {
      expect(result.sysprompt?.postHistoryInstructions).toBe('');
    });
  });

  describe('reasoning', () => {
    it('parses prefix', () => {
      expect(result.reasoning?.prefix).toBe('<|channel>thought\n');
    });

    it('parses suffix', () => {
      expect(result.reasoning?.suffix).toBe('<channel|>');
    });

    it('parses separator', () => {
      expect(result.reasoning?.separator).toBe('\n\n');
    });
  });
});

describe('parseSillyTavernOptions — names_behavior edge cases', () => {
  it('handles names_behavior as number 0', () => {
    const result = parseSillyTavernOptions({
      instruct: { names_behavior: 0 },
    });
    expect(result.instruct?.namesBehavior).toBe('none');
  });

  it('handles names_behavior as number 1', () => {
    const result = parseSillyTavernOptions({
      instruct: { names_behavior: 1 },
    });
    expect(result.instruct?.namesBehavior).toBe('force');
  });

  it('handles names_behavior as number 2', () => {
    const result = parseSillyTavernOptions({
      instruct: { names_behavior: 2 },
    });
    expect(result.instruct?.namesBehavior).toBe('always');
  });

  it('handles names_behavior as string "force"', () => {
    const result = parseSillyTavernOptions({
      instruct: { names_behavior: 'force' },
    });
    expect(result.instruct?.namesBehavior).toBe('force');
  });

  it('handles names_behavior as string "always"', () => {
    const result = parseSillyTavernOptions({
      instruct: { names_behavior: 'always' },
    });
    expect(result.instruct?.namesBehavior).toBe('always');
  });

  it('handles unknown names_behavior string gracefully', () => {
    const result = parseSillyTavernOptions({
      instruct: { names_behavior: 'invalid' },
    });
    expect(result.instruct?.namesBehavior).toBe('none');
  });
});

describe('parseSillyTavernOptions — force_name2 field name variants', () => {
  it('prefers always_force_name2 over force_name2', () => {
    const result = parseSillyTavernOptions({
      context: { always_force_name2: false, force_name2: true },
    });
    expect(result.context?.forceName2).toBe(false);
  });

  it('falls back to force_name2 when always_force_name2 absent', () => {
    const result = parseSillyTavernOptions({
      context: { force_name2: true },
    });
    expect(result.context?.forceName2).toBe(true);
  });

  it('falls back to force_name2 when always_force_name2 absent', () => {
    const result = parseSillyTavernOptions({
      context: { force_name2: false },
    });
    expect(result.context?.forceName2).toBe(false);
  });
});
