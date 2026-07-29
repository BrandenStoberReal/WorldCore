import { useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RotateCcw, Check, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { InlineSection } from '@/components/drawers/InlineSection';
import { apiFetch, apiGet, apiPost } from '@/lib/api';
import { useDebouncedAutoSave } from '@/hooks';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { ReasoningSettings } from '@/shared/types/reasoning';

interface PresetResponse {
  category: string;
  data: Record<string, unknown>;
}

interface SyspromptPreset {
  name: string;
  content: string;
}

interface ContextTemplate {
  name: string;
  story_string: string;
  chat_start: string;
  example_separator: string;
}

interface InstructTemplate {
  name: string;
  enabled: boolean;
  story_string_prefix: string;
  story_string_suffix: string;
  input_sequence: string;
  input_suffix: string;
  output_sequence: string;
  output_suffix: string;
  system_sequence: string;
  system_suffix: string;
  first_output_sequence: string;
  last_output_sequence: string;
  first_input_sequence: string;
  last_input_sequence: string;
  last_system_sequence: string;
  stop_sequence: string;
  user_alignment_message: string;
  wrap: boolean;
  macro: boolean;
  sequences_as_stop_strings: boolean;
  skip_examples: boolean;
  names_behavior: 'none' | 'force' | 'always';
  activation_regex: string;
  system_prompt: string;
  separator_sequence: string;
  system_sequence_prefix: string;
  system_sequence_suffix: string;
  names: boolean;
  names_force_groups: boolean;
  system_same_as_user: boolean;
}

interface ReasoningTemplate {
  name: string;
  prefix: string;
  suffix: string;
  separator: string;
}

interface TextOptionsState {
  sysprompt: {
    enabled: boolean;
    selectedPreset: string;
    content: string;
    postHistoryInstructions: string;
  };
  context: {
    selectedPreset: string;
    storyString: string;
    chatStart: string;
    exampleSeparator: string;
    storyStringPosition: 'default' | 'inchat';
    storyStringDepth: number;
    storyStringRole: 'system' | 'user' | 'assistant';
    forceName2: boolean;
    singleLine: boolean;
    collapseNewlines: boolean;
    trimSpaces: boolean;
    trimSentences: boolean;
    separatorsAsStopStrings: boolean;
    namesAsStopStrings: boolean;
  };
  instruct: {
    enabled: boolean;
    selectedPreset: string;
    storyStringPrefix: string;
    storyStringSuffix: string;
    inputSequence: string;
    inputSuffix: string;
    outputSequence: string;
    outputSuffix: string;
    systemSequence: string;
    systemSuffix: string;
    firstOutputSequence: string;
    lastOutputSequence: string;
    firstInputSequence: string;
    lastInputSequence: string;
    lastSystemSequence: string;
    stopSequence: string;
    userAlignmentMessage: string;
    wrap: boolean;
    macro: boolean;
    sequencesAsStopStrings: boolean;
    skipExamples: boolean;
    namesBehavior: 'none' | 'force' | 'always';
    activationRegex: string;
    bindToContext: boolean;
    systemPrompt: string;
    separatorSequence: string;
    systemSequencePrefix: string;
    systemSequenceSuffix: string;
    names: boolean;
    namesForceGroups: boolean;
    systemSameAsUser: boolean;
  };
  stoppingStrings: string;
  tokenizer: string;
  tokenPadding: number;
  reasoning: ReasoningSettings;
  bindModelTemplates: boolean;
  markdownEscapeStrings: string;
  startReplyWith: string;
  showReplyPrefix: boolean;
}

const defaultState: TextOptionsState = {
  sysprompt: {
    enabled: true,
    selectedPreset: 'Neutral - Chat',
    content: "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}.",
    postHistoryInstructions: '',
  },
  context: {
    selectedPreset: 'Default',
    storyString: "{{#if system}}{{system}}\n{{/if}}{{#if description}}{{description}}\n{{/if}}{{#if personality}}{{char}}'s personality: {{personality}}\n{{/if}}{{#if scenario}}Scenario: {{scenario}}\n{{/if}}{{#if persona}}{{persona}}\n{{/if}}",
    chatStart: '***',
    exampleSeparator: '***',
    storyStringPosition: 'default',
    storyStringDepth: 1,
    storyStringRole: 'system',
    forceName2: true,
    singleLine: false,
    collapseNewlines: false,
    trimSpaces: true,
    trimSentences: false,
    separatorsAsStopStrings: true,
    namesAsStopStrings: true,
  },
  instruct: {
    enabled: false,
    selectedPreset: 'Alpaca',
    storyStringPrefix: '',
    storyStringSuffix: '',
    inputSequence: '### Instruction:',
    inputSuffix: '',
    outputSequence: '### Response:',
    outputSuffix: '',
    systemSequence: '',
    systemSuffix: '',
    firstOutputSequence: '',
    lastOutputSequence: '',
    firstInputSequence: '',
    lastInputSequence: '',
    lastSystemSequence: '',
    stopSequence: '',
    userAlignmentMessage: '',
    wrap: true,
    macro: true,
    sequencesAsStopStrings: true,
    skipExamples: false,
    namesBehavior: 'force',
    activationRegex: '',
    bindToContext: false,
    systemPrompt: '',
    separatorSequence: '',
    systemSequencePrefix: '',
    systemSequenceSuffix: '',
    names: false,
    namesForceGroups: false,
    systemSameAsUser: false,
  },
  stoppingStrings: '[]',
  tokenizer: 'best',
  tokenPadding: 64,
  reasoning: {
    selectedPreset: 'Default',
    prefix: '<think>',
    suffix: '</think>',
    separator: '\n',
    autoParse: false,
    autoExpand: false,
    showHidden: false,
    addToPrompts: false,
    maxAdditions: 1,
  },
  bindModelTemplates: false,
  markdownEscapeStrings: '',
  startReplyWith: '',
  showReplyPrefix: true,
};

function mergeDefaults(partial?: Partial<TextOptionsState>): TextOptionsState {
  return { ...defaultState, ...partial };
}

function parseSillyTavernOptions(json: Record<string, unknown>): Partial<TextOptionsState> {
  const result: Partial<TextOptionsState> = {};

  // Handle both full settings.json (has power_user) and individual preset files
  const powerUser = (json.power_user as Record<string, unknown> | undefined) ?? null;
  const source = powerUser ?? json;

  const getObj = (key: string): Record<string, unknown> | null => {
    const val = source[key];
    return val && typeof val === 'object' ? (val as Record<string, unknown>) : null;
  };

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
    if (typeof context.force_name2 === 'boolean')
      result.context.forceName2 = context.force_name2 as boolean;
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
    if (typeof instruct.names_behavior === 'number') {
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

  // Custom stopping strings - can be array or string
  if (source.custom_stopping_strings !== undefined) {
    if (Array.isArray(source.custom_stopping_strings)) {
      result.stoppingStrings = JSON.stringify(source.custom_stopping_strings);
    } else if (typeof source.custom_stopping_strings === 'string') {
      result.stoppingStrings = source.custom_stopping_strings as string;
    }
  }

  // Markdown escape strings - can be array or string
  if (source.markdown_escape_strings !== undefined) {
    if (Array.isArray(source.markdown_escape_strings)) {
      result.markdownEscapeStrings = (source.markdown_escape_strings as string[]).join(',');
    } else if (typeof source.markdown_escape_strings === 'string') {
      result.markdownEscapeStrings = source.markdown_escape_strings as string;
    }
  }

  return result;
}

interface PresetToSave {
  category: 'context' | 'instruct' | 'sysprompt' | 'reasoning';
  data: Record<string, unknown>;
}

function extractPresetsToSave(json: Record<string, unknown>, fileName: string): PresetToSave[] {
  const powerUser = (json.power_user as Record<string, unknown> | undefined) ?? null;
  const source = powerUser ?? json;
  const presets: PresetToSave[] = [];
  const baseName = fileName.replace(/\.json$/i, '') || 'Imported';

  const getObj = (key: string): Record<string, unknown> | null => {
    const val = source[key];
    return val && typeof val === 'object' ? (val as Record<string, unknown>) : null;
  };

  const ctx = getObj('context');
  if (ctx) {
    presets.push({
      category: 'context',
      data: { name: baseName, ...ctx },
    });
  }

  const inst = getObj('instruct');
  if (inst) {
    presets.push({
      category: 'instruct',
      data: { name: baseName, ...inst },
    });
  }

  const sys = getObj('sysprompt');
  if (sys) {
    presets.push({
      category: 'sysprompt',
      data: { name: baseName, ...sys },
    });
  }

  const reason = getObj('reasoning');
  if (reason) {
    presets.push({
      category: 'reasoning',
      data: { name: baseName, ...reason },
    });
  }

  return presets;
}

function deduplicatePresetName(baseName: string, existingNames: string[]): string {
  if (!existingNames.includes(baseName)) return baseName;
  let i = 1;
  while (existingNames.includes(`${baseName} (${i})`)) i++;
  return `${baseName} (${i})`;
}

const CONTEXT_CHECKBOXS = [
  ['forceName2', "Always add character's name to prompt"],
  ['singleLine', 'Generate only one line per request'],
  ['collapseNewlines', 'Collapse Consecutive Newlines'],
  ['trimSpaces', 'Trim spaces'],
  ['trimSentences', 'Trim Incomplete Sentences'],
  ['separatorsAsStopStrings', 'Separators as Stop Strings'],
  ['namesAsStopStrings', 'Names as Stop Strings'],
] as const;

const REASONING_CHECKBOXES = [
  ['autoParse', 'Auto-Parse'],
  ['autoExpand', 'Auto-Expand'],
  ['showHidden', 'Show Hidden'],
  ['addToPrompts', 'Add to Prompts'],
] as const;

type ContextCheckboxKey = (typeof CONTEXT_CHECKBOXS)[number][0];
type ReasoningCheckboxKey = (typeof REASONING_CHECKBOXES)[number][0];

export function TextOptionsPanel() {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/v1/settings/get'],
    queryFn: async () => {
      return await apiGet<{ textOptions?: Partial<TextOptionsState> } & Record<string, unknown>>(
        '/settings/get',
      );
    },
  });

  const textOptionsValue = useMemo(
    () => mergeDefaults(settings?.textOptions),
    [settings?.textOptions],
  );

  const autoSave = useDebouncedAutoSave<TextOptionsState>({
    value: textOptionsValue,
    save: async (data) => {
      await apiPost('/settings/save', { textOptions: data });
    },
    delayMs: 800,
    equals: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    savedDisplayMs: 2500,
  });

  const form = autoSave.local;
  const formRef = useRef(form);
  formRef.current = form;
  const setForm = useCallback(
    (action: TextOptionsState | ((prev: TextOptionsState) => TextOptionsState)) => {
      autoSave.setLocal(typeof action === 'function' ? action(formRef.current) : action);
    },
    [autoSave.setLocal],
  );

  const { data: syspromptPresets } = useQuery<SyspromptPreset[]>({
    queryKey: ['/api/v1/presets/all', 'sysprompt'],
    queryFn: async () => {
      const res = (await apiFetch('/presets/all', {
        method: 'POST',
        body: JSON.stringify({ category: 'sysprompt' }),
      })) as PresetResponse[];
      return res.map((p) => p.data as unknown as SyspromptPreset);
    },
  });

  const { data: contextPresets } = useQuery<ContextTemplate[]>({
    queryKey: ['/api/v1/presets/all', 'context'],
    queryFn: async () => {
      const res = (await apiFetch('/presets/all', {
        method: 'POST',
        body: JSON.stringify({ category: 'context' }),
      })) as PresetResponse[];
      return res.map((p) => p.data as unknown as ContextTemplate);
    },
  });

  const { data: instructPresets } = useQuery<InstructTemplate[]>({
    queryKey: ['/api/v1/presets/all', 'instruct'],
    queryFn: async () => {
      const res = (await apiFetch('/presets/all', {
        method: 'POST',
        body: JSON.stringify({ category: 'instruct' }),
      })) as PresetResponse[];
      return res.map((p) => p.data as unknown as InstructTemplate);
    },
  });

  const { data: reasoningPresets } = useQuery<ReasoningTemplate[]>({
    queryKey: ['/api/v1/presets/all', 'reasoning'],
    queryFn: async () => {
      const res = (await apiFetch('/presets/all', {
        method: 'POST',
        body: JSON.stringify({ category: 'reasoning' }),
      })) as PresetResponse[];
      return res.map((p) => p.data as unknown as ReasoningTemplate);
    },
  });

  const queryClient = useQueryClient();

  const handleReset = () => setForm(defaultState);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const text = event.target?.result;
          if (typeof text !== 'string') {
            toast.error('Failed to read file contents');
            return;
          }
          const json = JSON.parse(text) as Record<string, unknown>;

          const parsed = parseSillyTavernOptions(json);
          setForm((prev) => ({
            ...prev,
            ...parsed,
            context: parsed.context ? { ...prev.context, ...parsed.context } : prev.context,
            instruct: parsed.instruct ? { ...prev.instruct, ...parsed.instruct } : prev.instruct,
            sysprompt: parsed.sysprompt
              ? { ...prev.sysprompt, ...parsed.sysprompt }
              : prev.sysprompt,
            reasoning: parsed.reasoning
              ? { ...prev.reasoning, ...parsed.reasoning }
              : prev.reasoning,
          }));

          const presetsToSave = extractPresetsToSave(json, file.name);
          const savedNames: string[] = [];

          for (const { category, data } of presetsToSave) {
            const existingPresets =
              category === 'context'
                ? contextPresets
                : category === 'instruct'
                  ? instructPresets
                  : category === 'sysprompt'
                    ? syspromptPresets
                    : reasoningPresets;
            const existingNames = [...(existingPresets?.map((p) => p.name) ?? []), ...savedNames];

            const uniqueName = deduplicatePresetName(
              (data.name as string) || 'Imported',
              existingNames,
            );
            data.name = uniqueName;
            savedNames.push(uniqueName);

            await apiPost('/presets/import', {
              preset: { category, data },
            });
          }

          await queryClient.invalidateQueries({ queryKey: ['/api/v1/presets/all'] });

          if (presetsToSave.length > 0) {
            toast.success(
              `Settings imported and ${presetsToSave.length} preset${presetsToSave.length > 1 ? 's' : ''} saved`,
            );
          } else {
            toast.success('Settings imported successfully');
          }
        } catch {
          toast.error('Failed to parse JSON file');
        }
      };
      reader.onerror = () => {
        toast.error('Failed to read file');
      };
      reader.readAsText(file);

      // Reset so same file can be re-imported
      e.target.value = '';
    },
    [setForm, queryClient, contextPresets, instructPresets, syspromptPresets, reasoningPresets],
  );

  const loadPreset = (category: string, presetName: string) => {
    const presets =
      category === 'sysprompt'
        ? syspromptPresets
        : category === 'context'
          ? contextPresets
          : category === 'instruct'
            ? instructPresets
            : reasoningPresets;
    const preset = presets?.find((p) => p.name === presetName);
    if (!preset) return;

    if (category === 'sysprompt') {
      setForm((f) => ({
        ...f,
        sysprompt: {
          ...f.sysprompt,
          selectedPreset: presetName,
          content: (preset as SyspromptPreset).content,
        },
      }));
    } else if (category === 'context') {
      const ctx = preset as ContextTemplate;
      setForm((f) => ({
        ...f,
        context: {
          ...f.context,
          selectedPreset: presetName,
          storyString: ctx.story_string,
          chatStart: ctx.chat_start,
          exampleSeparator: ctx.example_separator,
        },
      }));
    } else if (category === 'instruct') {
      const inst = preset as InstructTemplate;
      setForm((f) => ({
        ...f,
        instruct: {
          ...f.instruct,
          selectedPreset: presetName,
          storyStringPrefix: inst.story_string_prefix,
          storyStringSuffix: inst.story_string_suffix,
          inputSequence: inst.input_sequence,
          inputSuffix: inst.input_suffix,
          outputSequence: inst.output_sequence,
          outputSuffix: inst.output_suffix,
          systemSequence: inst.system_sequence,
          systemSuffix: inst.system_suffix,
          firstOutputSequence: inst.first_output_sequence,
          lastOutputSequence: inst.last_output_sequence,
          firstInputSequence: inst.first_input_sequence,
          lastInputSequence: inst.last_input_sequence,
          lastSystemSequence: inst.last_system_sequence,
          stopSequence: inst.stop_sequence,
          userAlignmentMessage: inst.user_alignment_message,
          wrap: inst.wrap,
          macro: inst.macro,
          sequencesAsStopStrings: inst.sequences_as_stop_strings,
          skipExamples: inst.skip_examples,
          namesBehavior: inst.names_behavior,
          activationRegex: inst.activation_regex,
          systemPrompt: inst.system_prompt,
          separatorSequence: inst.separator_sequence,
          systemSequencePrefix: inst.system_sequence_prefix,
          systemSequenceSuffix: inst.system_sequence_suffix,
          names: inst.names,
          namesForceGroups: inst.names_force_groups,
          systemSameAsUser: inst.system_same_as_user,
        },
      }));
    } else if (category === 'reasoning') {
      const r = preset as ReasoningTemplate;
      setForm((f) => ({
        ...f,
        reasoning: {
          ...f.reasoning,
          selectedPreset: presetName,
          prefix: r.prefix,
          suffix: r.suffix,
          separator: r.separator,
        },
      }));
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" label="loading text options" className="h-64" />;
  }

  return (
    <div data-panel="textoptions" className="flex h-full flex-col gap-2.5">
      <PageHeader
        tag="[05] — TEXT"
        title="Text Options"
        description="System prompts, instruct templates, context formatting, and generation controls."
        action={
          <div className="flex items-center gap-2">
            {autoSave.status !== 'idle' && (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5',
                  autoSave.status === 'unsaved'
                    ? 'text-red-500'
                    : autoSave.status === 'saved'
                      ? 'text-green-500'
                      : autoSave.status === 'error'
                        ? 'text-destructive'
                        : 'text-muted-foreground/40',
                )}
              >
                {autoSave.status === 'saving' && <LoadingSpinner size="sm" />}
                {autoSave.status === 'saved' && <Check className="h-3.5 w-3.5" />}
                <span className="mono-tag">
                  {autoSave.status === 'saving' ? 'SAVING...' : autoSave.status.toUpperCase()}
                </span>
              </span>
            )}
            <Button variant="outline" onClick={handleImportClick} className="h-8">
              <Upload className="h-3.5 w-3.5" />
              <span className="mono-tag">IMPORT</span>
            </Button>
            <Button variant="outline" onClick={handleReset} className="h-8">
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="mono-tag">RESET</span>
            </Button>
          </div>
        }
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* 3-column responsive grid */}
      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
        {/* ─── Column 1: Context ─── */}
        <div className="space-y-3">
          <InlineSection
            panelId="textoptions"
            sectionId="context"
            title="Context Template"
            defaultOpen
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Preset</Label>
                <Select
                  value={form.context.selectedPreset}
                  onValueChange={(v) => loadPreset('context', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {(contextPresets ?? []).map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Story String</Label>
                <Textarea
                  value={form.context.storyString}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      context: { ...f.context, storyString: e.target.value },
                    }))
                  }
                  className="min-h-[100px] font-mono text-[13px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Chat Start</Label>
                <Textarea
                  value={form.context.chatStart}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, context: { ...f.context, chatStart: e.target.value } }))
                  }
                  className="min-h-[60px] font-mono text-[13px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Example Separator</Label>
                <Textarea
                  value={form.context.exampleSeparator}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      context: { ...f.context, exampleSeparator: e.target.value },
                    }))
                  }
                  className="min-h-[60px] font-mono text-[13px]"
                />
              </div>

              {/* Context Formatting */}
              <div className="border-border/50 space-y-2 border-t pt-2">
                <h5 className="text-muted-foreground text-[13px] font-semibold">
                  Context Formatting
                </h5>

                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">Story String Position</Label>
                  <Select
                    value={form.context.storyStringPosition}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        context: { ...f.context, storyStringPosition: v as 'default' | 'inchat' },
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default (top of context)</SelectItem>
                      <SelectItem value="inchat">In-chat @ Depth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.context.storyStringPosition === 'inchat' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Depth</Label>
                      <Input
                        type="number"
                        min={0}
                        value={form.context.storyStringDepth}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            context: {
                              ...f.context,
                              storyStringDepth: parseInt(e.target.value) || 0,
                            },
                          }))
                        }
                        className="font-mono text-[13px]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px] font-medium">Role</Label>
                      <Select
                        value={form.context.storyStringRole}
                        onValueChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            context: {
                              ...f.context,
                              storyStringRole: v as 'system' | 'user' | 'assistant',
                            },
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="assistant">Assistant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {CONTEXT_CHECKBOXS.map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={form.context[key]}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          context: { ...f.context, [key]: e.target.checked },
                        }))
                      }
                      className="border-border rounded"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </InlineSection>
        </div>

        {/* ─── Column 2: Instruct ─── */}
        <div className="space-y-3">
          <InlineSection
            panelId="textoptions"
            sectionId="instruct"
            title="Instruct Template"
            defaultOpen
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-medium">Enable Instruct Mode</Label>
                <button
                  role="switch"
                  aria-checked={form.instruct.enabled}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      instruct: { ...f.instruct, enabled: !f.instruct.enabled },
                    }))
                  }
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                    form.instruct.enabled ? 'bg-ember' : 'bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'bg-background pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition-transform',
                      form.instruct.enabled ? 'translate-x-4' : 'translate-x-0',
                    )}
                  />
                </button>
              </div>

              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={form.instruct.bindToContext}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      instruct: { ...f.instruct, bindToContext: e.target.checked },
                    }))
                  }
                  className="border-border rounded"
                />
                Bind to Context
              </label>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Preset</Label>
                <Select
                  value={form.instruct.selectedPreset}
                  onValueChange={(v) => loadPreset('instruct', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {(instructPresets ?? []).map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Story String Prefix</Label>
                <Textarea
                  value={form.instruct.storyStringPrefix}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      instruct: { ...f.instruct, storyStringPrefix: e.target.value },
                    }))
                  }
                  className="min-h-[60px] font-mono text-[13px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Story String Suffix</Label>
                <Textarea
                  value={form.instruct.storyStringSuffix}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      instruct: { ...f.instruct, storyStringSuffix: e.target.value },
                    }))
                  }
                  className="min-h-[60px] font-mono text-[13px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Activation Regex</Label>
                <Input
                  value={form.instruct.activationRegex}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      instruct: { ...f.instruct, activationRegex: e.target.value },
                    }))
                  }
                  placeholder="e.g. /llama(-)?[3|3.1]/i"
                  className="font-mono text-[13px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">User Prefix</Label>
                  <Textarea
                    value={form.instruct.inputSequence}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        instruct: { ...f.instruct, inputSequence: e.target.value },
                      }))
                    }
                    className="min-h-[60px] font-mono text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">User Suffix</Label>
                  <Textarea
                    value={form.instruct.inputSuffix}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        instruct: { ...f.instruct, inputSuffix: e.target.value },
                      }))
                    }
                    className="min-h-[60px] font-mono text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">Assistant Prefix</Label>
                  <Textarea
                    value={form.instruct.outputSequence}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        instruct: { ...f.instruct, outputSequence: e.target.value },
                      }))
                    }
                    className="min-h-[60px] font-mono text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">Assistant Suffix</Label>
                  <Textarea
                    value={form.instruct.outputSuffix}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        instruct: { ...f.instruct, outputSuffix: e.target.value },
                      }))
                    }
                    className="min-h-[60px] font-mono text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">System Prefix</Label>
                  <Textarea
                    value={form.instruct.systemSequence}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        instruct: { ...f.instruct, systemSequence: e.target.value },
                      }))
                    }
                    className="min-h-[60px] font-mono text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">System Suffix</Label>
                  <Textarea
                    value={form.instruct.systemSuffix}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        instruct: { ...f.instruct, systemSuffix: e.target.value },
                      }))
                    }
                    className="min-h-[60px] font-mono text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">System Sequence Prefix</Label>
                  <Textarea
                    value={form.instruct.systemSequencePrefix}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        instruct: { ...f.instruct, systemSequencePrefix: e.target.value },
                      }))
                    }
                    className="min-h-[60px] font-mono text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">System Sequence Suffix</Label>
                  <Textarea
                    value={form.instruct.systemSequenceSuffix}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        instruct: { ...f.instruct, systemSequenceSuffix: e.target.value },
                      }))
                    }
                    className="min-h-[60px] font-mono text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">First Assistant Prefix</Label>
                  <Textarea
                    value={form.instruct.firstOutputSequence}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        instruct: { ...f.instruct, firstOutputSequence: e.target.value },
                      }))
                    }
                    className="min-h-[60px] font-mono text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">Last Assistant Prefix</Label>
                  <Textarea
                    value={form.instruct.lastOutputSequence}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        instruct: { ...f.instruct, lastOutputSequence: e.target.value },
                      }))
                    }
                    className="min-h-[60px] font-mono text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">First User Prefix</Label>
                  <Textarea
                    value={form.instruct.firstInputSequence}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        instruct: { ...f.instruct, firstInputSequence: e.target.value },
                      }))
                    }
                    className="min-h-[60px] font-mono text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">Last User Prefix</Label>
                  <Textarea
                    value={form.instruct.lastInputSequence}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        instruct: { ...f.instruct, lastInputSequence: e.target.value },
                      }))
                    }
                    className="min-h-[60px] font-mono text-[13px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">System Instruction Prefix</Label>
                  <Textarea
                    value={form.instruct.lastSystemSequence}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        instruct: { ...f.instruct, lastSystemSequence: e.target.value },
                      }))
                    }
                    className="min-h-[60px] font-mono text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">Stop Sequence</Label>
                  <Textarea
                    value={form.instruct.stopSequence}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        instruct: { ...f.instruct, stopSequence: e.target.value },
                      }))
                    }
                    className="min-h-[60px] font-mono text-[13px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">User Filler Message</Label>
                <Textarea
                  value={form.instruct.userAlignmentMessage}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      instruct: { ...f.instruct, userAlignmentMessage: e.target.value },
                    }))
                  }
                  className="min-h-[60px] font-mono text-[13px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">System Prompt</Label>
                <Textarea
                  value={form.instruct.systemPrompt}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      instruct: { ...f.instruct, systemPrompt: e.target.value },
                    }))
                  }
                  className="min-h-[80px] font-mono text-[13px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Separator Sequence</Label>
                <Textarea
                  value={form.instruct.separatorSequence}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      instruct: { ...f.instruct, separatorSequence: e.target.value },
                    }))
                  }
                  className="min-h-[60px] font-mono text-[13px]"
                />
              </div>

              <div className="flex flex-wrap gap-4">
                {(
                  [
                    ['wrap', 'Wrap Sequences'],
                    ['macro', 'Replace Macro'],
                    ['sequencesAsStopStrings', 'Sequences as Stop Strings'],
                    ['skipExamples', 'Skip Example Formatting'],
                    ['names', 'Include Names'],
                    ['namesForceGroups', 'Force Group Names'],
                    ['systemSameAsUser', 'System Same as User'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={form.instruct[key]}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          instruct: { ...f.instruct, [key]: e.target.checked },
                        }))
                      }
                      className="border-border rounded"
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Include Names</Label>
                <Select
                  value={form.instruct.namesBehavior}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      instruct: { ...f.instruct, namesBehavior: v as 'none' | 'force' | 'always' },
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select behavior" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Never</SelectItem>
                    <SelectItem value="force">Groups and Past Personas</SelectItem>
                    <SelectItem value="always">Always</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </InlineSection>
        </div>

        {/* ─── Column 3: System Prompt + Stopping + Reasoning + Misc ─── */}
        <div className="space-y-3">
          <InlineSection
            panelId="textoptions"
            sectionId="sysprompt"
            title="System Prompt"
            defaultOpen
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-[13px] font-medium">Enable System Prompt</Label>
                <button
                  role="switch"
                  aria-checked={form.sysprompt.enabled}
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      sysprompt: { ...f.sysprompt, enabled: !f.sysprompt.enabled },
                    }))
                  }
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                    form.sysprompt.enabled ? 'bg-ember' : 'bg-muted',
                  )}
                >
                  <span
                    className={cn(
                      'bg-background pointer-events-none inline-block h-4 w-4 transform rounded-full shadow-lg ring-0 transition-transform',
                      form.sysprompt.enabled ? 'translate-x-4' : 'translate-x-0',
                    )}
                  />
                </button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Preset</Label>
                <Select
                  value={form.sysprompt.selectedPreset}
                  onValueChange={(v) => loadPreset('sysprompt', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {(syspromptPresets ?? []).map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Prompt Content</Label>
                <Textarea
                  value={form.sysprompt.content}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sysprompt: { ...f.sysprompt, content: e.target.value },
                    }))
                  }
                  placeholder="Enter system prompt..."
                  className="min-h-[120px] font-mono text-[13px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Post-History Instructions</Label>
                <Textarea
                  value={form.sysprompt.postHistoryInstructions}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sysprompt: { ...f.sysprompt, postHistoryInstructions: e.target.value },
                    }))
                  }
                  placeholder="Instructions applied after chat history..."
                  className="min-h-[80px] font-mono text-[13px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Tokenizer</Label>
                <Select
                  value={form.tokenizer}
                  onValueChange={(v) => setForm((f) => ({ ...f, tokenizer: v }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="best">Best match (recommended)</SelectItem>
                    <SelectItem value="none">None / Estimated</SelectItem>
                    <SelectItem value="gpt2">GPT-2</SelectItem>
                    <SelectItem value="llama12">Llama 1/2</SelectItem>
                    <SelectItem value="llama3">Llama 3</SelectItem>
                    <SelectItem value="gemma">Gemma / Gemini</SelectItem>
                    <SelectItem value="jamba">Jamba</SelectItem>
                    <SelectItem value="qwen2">Qwen2</SelectItem>
                    <SelectItem value="commandr">Command-R</SelectItem>
                    <SelectItem value="commanda">Command-A</SelectItem>
                    <SelectItem value="nerdstash">NerdStash (NovelAI Clio)</SelectItem>
                    <SelectItem value="nerdstashv2">NerdStash v2 (NovelAI Kayra)</SelectItem>
                    <SelectItem value="mistralv1">Mistral V1</SelectItem>
                    <SelectItem value="mistralnemo">Mistral Nemo</SelectItem>
                    <SelectItem value="yi">Yi</SelectItem>
                    <SelectItem value="claude">Claude 1/2</SelectItem>
                    <SelectItem value="deepseekv3">DeepSeek V3</SelectItem>
                    <SelectItem value="api">API (WebUI / koboldcpp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Token Padding</Label>
                <Input
                  type="number"
                  min={-2048}
                  max={2048}
                  value={form.tokenPadding}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tokenPadding: parseInt(e.target.value) || 0 }))
                  }
                  className="font-mono text-[13px]"
                />
              </div>
            </div>
          </InlineSection>

          <InlineSection panelId="textoptions" sectionId="stopping" title="Custom Stopping Strings">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Stopping Strings (JSON array)</Label>
                <Textarea
                  value={form.stoppingStrings}
                  onChange={(e) => setForm((f) => ({ ...f, stoppingStrings: e.target.value }))}
                  placeholder='["stop1", "stop2"]'
                  className="min-h-[80px] font-mono text-[13px]"
                />
              </div>
            </div>
          </InlineSection>

          <InlineSection panelId="textoptions" sectionId="reasoning" title="Reasoning">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Preset</Label>
                <Select
                  value={form.reasoning.selectedPreset}
                  onValueChange={(v) => loadPreset('reasoning', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {(reasoningPresets ?? []).map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">Prefix</Label>
                  <Textarea
                    value={form.reasoning.prefix}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        reasoning: { ...f.reasoning, prefix: e.target.value },
                      }))
                    }
                    className="min-h-[60px] font-mono text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">Suffix</Label>
                  <Textarea
                    value={form.reasoning.suffix}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        reasoning: { ...f.reasoning, suffix: e.target.value },
                      }))
                    }
                    className="min-h-[60px] font-mono text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium">Separator</Label>
                  <Textarea
                    value={form.reasoning.separator}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        reasoning: { ...f.reasoning, separator: e.target.value },
                      }))
                    }
                    className="min-h-[60px] font-mono text-[13px]"
                  />
                </div>
              </div>

              <div className="border-border/50 grid grid-cols-2 gap-2 border-t pt-2">
                {REASONING_CHECKBOXES.map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={form.reasoning[key]}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          reasoning: { ...f.reasoning, [key]: e.target.checked },
                        }))
                      }
                      className="border-border rounded"
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Max Reasoning Additions</Label>
                <Input
                  type="number"
                  min={0}
                  max={999}
                  value={form.reasoning.maxAdditions}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      reasoning: { ...f.reasoning, maxAdditions: parseInt(e.target.value) || 0 },
                    }))
                  }
                  className="w-24 font-mono text-[13px]"
                />
              </div>
            </div>
          </InlineSection>

          <InlineSection panelId="textoptions" sectionId="misc" title="Miscellaneous">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={form.bindModelTemplates}
                  onChange={(e) => setForm((f) => ({ ...f, bindModelTemplates: e.target.checked }))}
                  className="border-border rounded"
                />
                Bind Model to Templates
              </label>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Non-markdown Strings</Label>
                <Input
                  value={form.markdownEscapeStrings}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, markdownEscapeStrings: e.target.value }))
                  }
                  placeholder="comma delimited, no spaces between"
                  className="font-mono text-[13px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px] font-medium">Start Reply With</Label>
                <Textarea
                  value={form.startReplyWith}
                  onChange={(e) => setForm((f) => ({ ...f, startReplyWith: e.target.value }))}
                  className="min-h-[60px] font-mono text-[13px]"
                />
              </div>

              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={form.showReplyPrefix}
                  onChange={(e) => setForm((f) => ({ ...f, showReplyPrefix: e.target.checked }))}
                  className="border-border rounded"
                />
                Show reply prefix in chat
              </label>
            </div>
          </InlineSection>
        </div>
      </div>
    </div>
  );
}
