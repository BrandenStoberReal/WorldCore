import { TextOptionsDefaults } from '@/shared/schemas/text-options';
import type { z } from 'zod';
import type { TextOptionsSchema } from '@/shared/schemas/text-options';

type TextOptionsState = z.infer<typeof TextOptionsSchema>;

export function parseSillyTavernOptions(json: Record<string, unknown>): Partial<TextOptionsState> {
  const result: Partial<TextOptionsState> = {};

  const powerUser = (json.power_user as Record<string, unknown> | undefined) ?? null;
  const source = powerUser ?? json;

  const getObj = (key: string): Record<string, unknown> | null => {
    const val = source[key];
    return val && typeof val === 'object' ? (val as Record<string, unknown>) : null;
  };

  const defaultState = TextOptionsDefaults;

  const context = getObj('context');
  if (context) {
    result.context = { ...defaultState.context };
    if (typeof context.story_string === 'string')
      result.context.storyString = context.story_string as string;
    if (typeof context.chat_start === 'string')
      result.context.chatStart = context.chat_start as string;
    if (typeof context.example_separator === 'string')
      result.context.exampleSeparator = context.example_separator as string;
    if (typeof context.use_stop_strings === 'boolean')
      result.context.separatorsAsStopStrings = context.use_stop_strings as boolean;
    if (typeof context.names_as_stop_strings === 'boolean')
      result.context.namesAsStopStrings = context.names_as_stop_strings as boolean;
    if (typeof context.story_string_position === 'number')
      result.context.storyStringPosition =
        context.story_string_position === 1 ? 'inchat' : 'default';
    if (typeof context.story_string_depth === 'number')
      result.context.storyStringDepth = context.story_string_depth as number;
    if (typeof context.story_string_role === 'number') {
      const roles = ['system', 'user', 'assistant'] as const;
      result.context.storyStringRole = roles[context.story_string_role as number] ?? 'system';
    }
    const name2 =
      typeof context.always_force_name2 === 'boolean'
        ? context.always_force_name2
        : typeof context.force_name2 === 'boolean'
          ? context.force_name2
          : undefined;
    if (name2 !== undefined) result.context.forceName2 = name2;
    if (typeof context.trim_sentences === 'boolean')
      result.context.trimSentences = context.trim_sentences as boolean;
    if (typeof context.trim_spaces === 'boolean')
      result.context.trimSpaces = context.trim_spaces as boolean;
    if (typeof context.single_line === 'boolean')
      result.context.singleLine = context.single_line as boolean;
    if (typeof context.collapse_newlines === 'boolean')
      result.context.collapseNewlines = context.collapse_newlines as boolean;
  }

  const instruct = getObj('instruct');
  if (instruct) {
    result.instruct = { ...defaultState.instruct };
    if (typeof instruct.enabled === 'boolean')
      result.instruct.enabled = instruct.enabled as boolean;
    if (typeof instruct.input_sequence === 'string')
      result.instruct.inputSequence = instruct.input_sequence as string;
    if (typeof instruct.input_suffix === 'string')
      result.instruct.inputSuffix = instruct.input_suffix as string;
    if (typeof instruct.output_sequence === 'string')
      result.instruct.outputSequence = instruct.output_sequence as string;
    if (typeof instruct.output_suffix === 'string')
      result.instruct.outputSuffix = instruct.output_suffix as string;
    if (typeof instruct.system_sequence === 'string')
      result.instruct.systemSequence = instruct.system_sequence as string;
    if (typeof instruct.system_suffix === 'string')
      result.instruct.systemSuffix = instruct.system_suffix as string;
    if (typeof instruct.last_system_sequence === 'string')
      result.instruct.lastSystemSequence = instruct.last_system_sequence as string;
    if (typeof instruct.first_input_sequence === 'string')
      result.instruct.firstInputSequence = instruct.first_input_sequence as string;
    if (typeof instruct.first_output_sequence === 'string')
      result.instruct.firstOutputSequence = instruct.first_output_sequence as string;
    if (typeof instruct.last_input_sequence === 'string')
      result.instruct.lastInputSequence = instruct.last_input_sequence as string;
    if (typeof instruct.last_output_sequence === 'string')
      result.instruct.lastOutputSequence = instruct.last_output_sequence as string;
    if (typeof instruct.story_string_prefix === 'string')
      result.instruct.storyStringPrefix = instruct.story_string_prefix as string;
    if (typeof instruct.story_string_suffix === 'string')
      result.instruct.storyStringSuffix = instruct.story_string_suffix as string;
    if (typeof instruct.stop_sequence === 'string')
      result.instruct.stopSequence = instruct.stop_sequence as string;
    if (typeof instruct.wrap === 'boolean') result.instruct.wrap = instruct.wrap as boolean;
    if (typeof instruct.macro === 'boolean') result.instruct.macro = instruct.macro as boolean;
    if (typeof instruct.skip_examples === 'boolean')
      result.instruct.skipExamples = instruct.skip_examples as boolean;
    if (typeof instruct.names_behavior === 'string') {
      const behaviors = ['none', 'force', 'always'] as const;
      result.instruct.namesBehavior = behaviors.includes(
        instruct.names_behavior as (typeof behaviors)[number],
      )
        ? (instruct.names_behavior as (typeof behaviors)[number])
        : 'none';
    } else if (typeof instruct.names_behavior === 'number') {
      const behaviors = ['none', 'force', 'always'] as const;
      result.instruct.namesBehavior = behaviors[instruct.names_behavior as number] ?? 'none';
    }
    if (typeof instruct.activation_regex === 'string')
      result.instruct.activationRegex = instruct.activation_regex as string;
    if (typeof instruct.bind_to_context === 'boolean')
      result.instruct.bindToContext = instruct.bind_to_context as boolean;
    if (typeof instruct.user_alignment_message === 'string')
      result.instruct.userAlignmentMessage = instruct.user_alignment_message as string;
    if (typeof instruct.system_same_as_user === 'boolean')
      result.instruct.systemSameAsUser = instruct.system_same_as_user as boolean;
    if (typeof instruct.sequences_as_stop_strings === 'boolean')
      result.instruct.sequencesAsStopStrings = instruct.sequences_as_stop_strings as boolean;
  }

  const sysprompt = getObj('sysprompt');
  if (sysprompt) {
    result.sysprompt = { ...defaultState.sysprompt };
    if (typeof sysprompt.enabled === 'boolean')
      result.sysprompt.enabled = sysprompt.enabled as boolean;
    if (typeof sysprompt.content === 'string')
      result.sysprompt.content = sysprompt.content as string;
    if (typeof sysprompt.post_history === 'string')
      result.sysprompt.postHistoryInstructions = sysprompt.post_history as string;
  }

  const reasoning = getObj('reasoning');
  if (reasoning) {
    result.reasoning = { ...defaultState.reasoning };
    if (typeof reasoning.prefix === 'string') result.reasoning.prefix = reasoning.prefix as string;
    if (typeof reasoning.suffix === 'string') result.reasoning.suffix = reasoning.suffix as string;
    if (typeof reasoning.separator === 'string')
      result.reasoning.separator = reasoning.separator as string;
    if (typeof reasoning.auto_parse === 'boolean')
      result.reasoning.autoParse = reasoning.auto_parse as boolean;
    if (typeof reasoning.add_to_prompts === 'boolean')
      result.reasoning.addToPrompts = reasoning.add_to_prompts as boolean;
    if (typeof reasoning.auto_expand === 'boolean')
      result.reasoning.autoExpand = reasoning.auto_expand as boolean;
    if (typeof reasoning.show_hidden === 'boolean')
      result.reasoning.showHidden = reasoning.show_hidden as boolean;
    if (typeof reasoning.max_additions === 'number')
      result.reasoning.maxAdditions = reasoning.max_additions as number;
  }

  if (typeof source.tokenizer === 'number') {
    const tokenizerMap: Record<number, string> = {
      0: 'best',
      1: 'none',
      2: 'gpt2',
      3: 'llama12',
      4: 'llama3',
      5: 'gemma',
      6: 'jamba',
      7: 'qwen2',
      8: 'commandr',
      9: 'nerdstash',
      10: 'nerdstashv2',
      11: 'mistralv1',
      12: 'mistralnemo',
      13: 'yi',
      14: 'claude',
      15: 'deepseekv3',
    };
    result.tokenizer = tokenizerMap[source.tokenizer as number] ?? 'best';
  }
  if (typeof source.token_padding === 'number')
    result.tokenPadding = source.token_padding as number;
  if (typeof source.user_prompt_bias === 'string')
    result.startReplyWith = source.user_prompt_bias as string;
  if (typeof source.show_user_prompt_bias === 'boolean')
    result.showReplyPrefix = source.show_user_prompt_bias as boolean;

  if (source.custom_stopping_strings !== undefined) {
    if (Array.isArray(source.custom_stopping_strings)) {
      result.stoppingStrings = JSON.stringify(source.custom_stopping_strings);
    } else if (typeof source.custom_stopping_strings === 'string') {
      result.stoppingStrings = source.custom_stopping_strings as string;
    }
  }

  if (source.markdown_escape_strings !== undefined) {
    if (Array.isArray(source.markdown_escape_strings)) {
      result.markdownEscapeStrings = (source.markdown_escape_strings as string[]).join(',');
    } else if (typeof source.markdown_escape_strings === 'string') {
      result.markdownEscapeStrings = source.markdown_escape_strings as string;
    }
  }

  return result;
}
