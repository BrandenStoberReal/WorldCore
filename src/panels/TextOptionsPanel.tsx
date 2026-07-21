import { useCallback, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { Loader2, RotateCcw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InlineSection } from '@/components/drawers/InlineSection';
import { apiFetch, apiGet, apiPost } from '@/lib/api';
import { useDebouncedAutoSave } from '@/hooks';

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
  reasoning: {
    selectedPreset: string;
    prefix: string;
    suffix: string;
    separator: string;
    autoParse: boolean;
    autoExpand: boolean;
    showHidden: boolean;
    addToPrompts: boolean;
    maxAdditions: number;
  };
  bindModelTemplates: boolean;
  markdownEscapeStrings: string;
  startReplyWith: string;
  showReplyPrefix: boolean;
}

const defaultState: TextOptionsState = {
  sysprompt: {
    enabled: false,
    selectedPreset: 'Blank',
    content: '',
    postHistoryInstructions: '',
  },
  context: {
    selectedPreset: 'ChatML',
    storyString: "{{char}}'s Description:\n{{description}}",
    chatStart: '',
    exampleSeparator: '',
    storyStringPosition: 'default',
    storyStringDepth: 0,
    storyStringRole: 'system',
    forceName2: false,
    singleLine: false,
    collapseNewlines: false,
    trimSpaces: true,
    trimSentences: false,
    separatorsAsStopStrings: false,
    namesAsStopStrings: false,
  },
  instruct: {
    enabled: false,
    selectedPreset: 'ChatML',
    storyStringPrefix: '',
    storyStringSuffix: '',
    inputSequence: '<|user|>\n',
    inputSuffix: '',
    outputSequence: '<|model|>\n',
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
    wrap: false,
    macro: false,
    sequencesAsStopStrings: false,
    skipExamples: false,
    namesBehavior: 'none',
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
  tokenPadding: 0,
  reasoning: {
    selectedPreset: 'Blank',
    prefix: '',
    suffix: '',
    separator: '',
    autoParse: false,
    autoExpand: false,
    showHidden: false,
    addToPrompts: false,
    maxAdditions: 0,
  },
  bindModelTemplates: false,
  markdownEscapeStrings: '',
  startReplyWith: '',
  showReplyPrefix: false,
};

function mergeDefaults(partial?: Partial<TextOptionsState>): TextOptionsState {
  return { ...defaultState, ...partial };
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

  const handleReset = () => setForm(defaultState);

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
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="text-ember h-7 w-7 animate-spin" />
        <span className="mono-tag text-muted-foreground/55">loading text options</span>
      </div>
    );
  }

  return (
    <div data-panel="textoptions" className="flex h-full flex-col gap-2.5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2.5">
            <span className="mono-tag text-ember">{`[05] — TEXT`}</span>
            <span className="bg-ember/40 h-px w-8" />
          </div>
          <h2 className="display-host text-[30px] leading-none tracking-tight">Text Options</h2>
          <p className="text-muted-foreground mt-1.5 max-w-md text-[13px] leading-snug">
            System prompts, instruct templates, context formatting, and generation controls.
          </p>
        </div>
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
              {autoSave.status === 'saving' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {autoSave.status === 'saved' && <Check className="h-3.5 w-3.5" />}
              <span className="mono-tag">
                {autoSave.status === 'saving' ? 'SAVING...' : autoSave.status.toUpperCase()}
              </span>
            </span>
          )}
          <Button variant="outline" onClick={handleReset} className="h-8">
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="mono-tag">RESET</span>
          </Button>
        </div>
      </header>

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
