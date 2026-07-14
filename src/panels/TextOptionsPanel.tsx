import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save, RotateCcw, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { InlineSection } from "@/components/drawers/InlineSection"
import { apiFetch } from "@/lib/api"

interface SyspromptPreset {
  name: string
  content: string
}

interface ContextTemplate {
  name: string
  story_string: string
  chat_start: string
  example_separator: string
}

interface InstructTemplate {
  name: string
  enabled: boolean
  story_string_prefix: string
  story_string_suffix: string
  input_sequence: string
  input_suffix: string
  output_sequence: string
  output_suffix: string
  system_sequence: string
  system_suffix: string
  first_output_sequence: string
  last_output_sequence: string
  first_input_sequence: string
  last_input_sequence: string
  last_system_sequence: string
  stop_sequence: string
  user_alignment_message: string
  wrap: boolean
  macro: boolean
  sequences_as_stop_strings: boolean
  skip_examples: boolean
  names_behavior: "none" | "force" | "always"
  activation_regex: string
}

interface ReasoningTemplate {
  name: string
  prefix: string
  suffix: string
  separator: string
}

interface TextOptionsState {
  sysprompt: {
    enabled: boolean
    selectedPreset: string
    content: string
    postHistoryInstructions: string
  }
  context: {
    selectedPreset: string
    storyString: string
    chatStart: string
    exampleSeparator: string
  }
  instruct: {
    enabled: boolean
    selectedPreset: string
    storyStringPrefix: string
    storyStringSuffix: string
    inputSequence: string
    inputSuffix: string
    outputSequence: string
    outputSuffix: string
    systemSequence: string
    systemSuffix: string
    firstOutputSequence: string
    lastOutputSequence: string
    firstInputSequence: string
    lastInputSequence: string
    lastSystemSequence: string
    stopSequence: string
    userAlignmentMessage: string
    wrap: boolean
    macro: boolean
    sequencesAsStopStrings: boolean
    skipExamples: boolean
    namesBehavior: "none" | "force" | "always"
    activationRegex: string
  }
  stoppingStrings: string
  startReplyWith: string
  reasoning: {
    selectedPreset: string
    prefix: string
    suffix: string
    separator: string
  }
}

const defaultState: TextOptionsState = {
  sysprompt: {
    enabled: false,
    selectedPreset: "default",
    content: "",
    postHistoryInstructions: "",
  },
  context: {
    selectedPreset: "default",
    storyString: "{{char}}'s Description:\n{{description}}",
    chatStart: "",
    exampleSeparator: "",
  },
  instruct: {
    enabled: false,
    selectedPreset: "default",
    storyStringPrefix: "",
    storyStringSuffix: "",
    inputSequence: "<|user|>\n",
    inputSuffix: "",
    outputSequence: "<|model|>\n",
    outputSuffix: "",
    systemSequence: "",
    systemSuffix: "",
    firstOutputSequence: "",
    lastOutputSequence: "",
    firstInputSequence: "",
    lastInputSequence: "",
    lastSystemSequence: "",
    stopSequence: "",
    userAlignmentMessage: "",
    wrap: false,
    macro: false,
    sequencesAsStopStrings: false,
    skipExamples: false,
    namesBehavior: "none",
    activationRegex: "",
  },
  stoppingStrings: "[]",
  startReplyWith: "",
  reasoning: {
    selectedPreset: "default",
    prefix: "",
    suffix: "",
    separator: "",
  },
}

export function TextOptionsPanel() {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<TextOptionsState>(defaultState)

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/v1/settings/get"],
    queryFn: async () => {
      const res = await fetch("/api/v1/settings/get")
      if (!res.ok) throw new Error("Failed to fetch settings")
      const data = await res.json()
      return Array.isArray(data) ? data : (data.results ?? data.data ?? data)
    },
  })

  useEffect(() => {
    if (settings?.textOptions) {
      setForm({ ...defaultState, ...settings.textOptions })
    }
  }, [settings])

  const { data: syspromptPresets } = useQuery<SyspromptPreset[]>({
    queryKey: ["/api/v1/presets/all", "sysprompt"],
    queryFn: () => apiFetch("/presets/all", { method: "POST", body: JSON.stringify({ category: "sysprompt" }) }) as Promise<SyspromptPreset[]>,
  })

  const { data: contextPresets } = useQuery<ContextTemplate[]>({
    queryKey: ["/api/v1/presets/all", "context"],
    queryFn: () => apiFetch("/presets/all", { method: "POST", body: JSON.stringify({ category: "context" }) }) as Promise<ContextTemplate[]>,
  })

  const { data: instructPresets } = useQuery<InstructTemplate[]>({
    queryKey: ["/api/v1/presets/all", "instruct"],
    queryFn: () => apiFetch("/presets/all", { method: "POST", body: JSON.stringify({ category: "instruct" }) }) as Promise<InstructTemplate[]>,
  })

  const { data: reasoningPresets } = useQuery<ReasoningTemplate[]>({
    queryKey: ["/api/v1/presets/all", "reasoning"],
    queryFn: () => apiFetch("/presets/all", { method: "POST", body: JSON.stringify({ category: "reasoning" }) }) as Promise<ReasoningTemplate[]>,
  })

  const saveMutation = useMutation({
    mutationFn: async (data: TextOptionsState) => {
      const res = await fetch("/api/v1/settings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ textOptions: data }),
      })
      if (!res.ok) throw new Error("Failed to save text options")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/settings/get"] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  const handleSave = () => saveMutation.mutate(form)
  const handleReset = () => setForm({ ...defaultState })

  const loadPreset = (category: string, presetName: string) => {
    const presets = category === "sysprompt" ? syspromptPresets
      : category === "context" ? contextPresets
      : category === "instruct" ? instructPresets
      : reasoningPresets
    const preset = presets?.find((p) => p.name === presetName)
    if (!preset) return

    if (category === "sysprompt") {
      setForm((f) => ({
        ...f,
        sysprompt: { ...f.sysprompt, selectedPreset: presetName, content: (preset as SyspromptPreset).content },
      }))
    } else if (category === "context") {
      const ctx = preset as ContextTemplate
      setForm((f) => ({
        ...f,
        context: { selectedPreset: presetName, storyString: ctx.story_string, chatStart: ctx.chat_start, exampleSeparator: ctx.example_separator },
      }))
    } else if (category === "instruct") {
      const inst = preset as InstructTemplate
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
        },
      }))
    } else if (category === "reasoning") {
      const r = preset as ReasoningTemplate
      setForm((f) => ({
        ...f,
        reasoning: { selectedPreset: presetName, prefix: r.prefix, suffix: r.suffix, separator: r.separator },
      }))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 flex-col gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-ember" />
        <span className="mono-tag text-muted-foreground/55">loading text options</span>
      </div>
    )
  }

  return (
    <div data-panel="textoptions" className="flex flex-col gap-3 h-full">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="mono-tag text-ember">{`[05] — TEXT`}</span>
            <span className="h-px w-10 bg-ember/40" />
          </div>
          <h2 className="display-host text-[42px] leading-none tracking-tight">
            Text Options
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            System prompts, instruct templates, context formatting, and generation controls.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="inline-flex items-center gap-2 text-ember">
              <Check className="h-4 w-4" />
              <span className="mono-tag">SAVED</span>
            </span>
          )}
          <Button variant="outline" onClick={handleReset} className="h-9">
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="mono-tag">RESET</span>
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="h-9 ember-pulse">
            {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span className="mono-tag font-bold">{saveMutation.isPending ? "SAVING..." : "SAVE"}</span>
          </Button>
        </div>
      </header>

      <InlineSection panelId="textoptions" sectionId="sysprompt" title="System Prompt" defaultOpen>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-[13px] font-medium">Enable System Prompt</Label>
            <button
              role="switch"
              aria-checked={form.sysprompt.enabled}
              onClick={() => setForm((f) => ({ ...f, sysprompt: { ...f.sysprompt, enabled: !f.sysprompt.enabled } }))}
              className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors", form.sysprompt.enabled ? "bg-ember" : "bg-muted")}
            >
              <span className={cn("pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition-transform", form.sysprompt.enabled ? "translate-x-4" : "translate-x-0")} />
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Preset</Label>
            <Select value={form.sysprompt.selectedPreset} onValueChange={(v) => loadPreset("sysprompt", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select preset" />
              </SelectTrigger>
              <SelectContent>
                {(syspromptPresets ?? []).map((p) => (
                  <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Prompt Content</Label>
            <Textarea
              value={form.sysprompt.content}
              onChange={(e) => setForm((f) => ({ ...f, sysprompt: { ...f.sysprompt, content: e.target.value } }))}
              placeholder="Enter system prompt..."
              className="font-mono text-[13px] min-h-[120px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Post-History Instructions</Label>
            <Textarea
              value={form.sysprompt.postHistoryInstructions}
              onChange={(e) => setForm((f) => ({ ...f, sysprompt: { ...f.sysprompt, postHistoryInstructions: e.target.value } }))}
              placeholder="Instructions applied after chat history..."
              className="font-mono text-[13px] min-h-[80px]"
            />
          </div>
        </div>
      </InlineSection>

      <InlineSection panelId="textoptions" sectionId="context" title="Context Template">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Preset</Label>
            <Select value={form.context.selectedPreset} onValueChange={(v) => loadPreset("context", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select preset" />
              </SelectTrigger>
              <SelectContent>
                {(contextPresets ?? []).map((p) => (
                  <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Story String</Label>
            <Textarea
              value={form.context.storyString}
              onChange={(e) => setForm((f) => ({ ...f, context: { ...f.context, storyString: e.target.value } }))}
              className="font-mono text-[13px] min-h-[100px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Chat Start</Label>
            <Textarea
              value={form.context.chatStart}
              onChange={(e) => setForm((f) => ({ ...f, context: { ...f.context, chatStart: e.target.value } }))}
              className="font-mono text-[13px] min-h-[60px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Example Separator</Label>
            <Textarea
              value={form.context.exampleSeparator}
              onChange={(e) => setForm((f) => ({ ...f, context: { ...f.context, exampleSeparator: e.target.value } }))}
              className="font-mono text-[13px] min-h-[60px]"
            />
          </div>
        </div>
      </InlineSection>

      <InlineSection panelId="textoptions" sectionId="instruct" title="Instruct Template">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-[13px] font-medium">Enable Instruct Mode</Label>
            <button
              role="switch"
              aria-checked={form.instruct.enabled}
              onClick={() => setForm((f) => ({ ...f, instruct: { ...f.instruct, enabled: !f.instruct.enabled } }))}
              className={cn("relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors", form.instruct.enabled ? "bg-ember" : "bg-muted")}
            >
              <span className={cn("pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg ring-0 transition-transform", form.instruct.enabled ? "translate-x-4" : "translate-x-0")} />
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Preset</Label>
            <Select value={form.instruct.selectedPreset} onValueChange={(v) => loadPreset("instruct", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select preset" />
              </SelectTrigger>
              <SelectContent>
                {(instructPresets ?? []).map((p) => (
                  <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Activation Regex</Label>
            <Input
              value={form.instruct.activationRegex}
              onChange={(e) => setForm((f) => ({ ...f, instruct: { ...f.instruct, activationRegex: e.target.value } }))}
              placeholder="e.g. /llama(-)?[3|3.1]/i"
              className="font-mono text-[13px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">User Prefix</Label>
              <Textarea value={form.instruct.inputSequence} onChange={(e) => setForm((f) => ({ ...f, instruct: { ...f.instruct, inputSequence: e.target.value } }))} className="font-mono text-[13px] min-h-[60px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">User Suffix</Label>
              <Textarea value={form.instruct.inputSuffix} onChange={(e) => setForm((f) => ({ ...f, instruct: { ...f.instruct, inputSuffix: e.target.value } }))} className="font-mono text-[13px] min-h-[60px]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Assistant Prefix</Label>
              <Textarea value={form.instruct.outputSequence} onChange={(e) => setForm((f) => ({ ...f, instruct: { ...f.instruct, outputSequence: e.target.value } }))} className="font-mono text-[13px] min-h-[60px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Assistant Suffix</Label>
              <Textarea value={form.instruct.outputSuffix} onChange={(e) => setForm((f) => ({ ...f, instruct: { ...f.instruct, outputSuffix: e.target.value } }))} className="font-mono text-[13px] min-h-[60px]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">System Prefix</Label>
              <Textarea value={form.instruct.systemSequence} onChange={(e) => setForm((f) => ({ ...f, instruct: { ...f.instruct, systemSequence: e.target.value } }))} className="font-mono text-[13px] min-h-[60px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">System Suffix</Label>
              <Textarea value={form.instruct.systemSuffix} onChange={(e) => setForm((f) => ({ ...f, instruct: { ...f.instruct, systemSuffix: e.target.value } }))} className="font-mono text-[13px] min-h-[60px]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">First Assistant Prefix</Label>
              <Textarea value={form.instruct.firstOutputSequence} onChange={(e) => setForm((f) => ({ ...f, instruct: { ...f.instruct, firstOutputSequence: e.target.value } }))} className="font-mono text-[13px] min-h-[60px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Last Assistant Prefix</Label>
              <Textarea value={form.instruct.lastOutputSequence} onChange={(e) => setForm((f) => ({ ...f, instruct: { ...f.instruct, lastOutputSequence: e.target.value } }))} className="font-mono text-[13px] min-h-[60px]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">First User Prefix</Label>
              <Textarea value={form.instruct.firstInputSequence} onChange={(e) => setForm((f) => ({ ...f, instruct: { ...f.instruct, firstInputSequence: e.target.value } }))} className="font-mono text-[13px] min-h-[60px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Last User Prefix</Label>
              <Textarea value={form.instruct.lastInputSequence} onChange={(e) => setForm((f) => ({ ...f, instruct: { ...f.instruct, lastInputSequence: e.target.value } }))} className="font-mono text-[13px] min-h-[60px]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">System Instruction Prefix</Label>
              <Textarea value={form.instruct.lastSystemSequence} onChange={(e) => setForm((f) => ({ ...f, instruct: { ...f.instruct, lastSystemSequence: e.target.value } }))} className="font-mono text-[13px] min-h-[60px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Stop Sequence</Label>
              <Textarea value={form.instruct.stopSequence} onChange={(e) => setForm((f) => ({ ...f, instruct: { ...f.instruct, stopSequence: e.target.value } }))} className="font-mono text-[13px] min-h-[60px]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">User Filler Message</Label>
            <Textarea value={form.instruct.userAlignmentMessage} onChange={(e) => setForm((f) => ({ ...f, instruct: { ...f.instruct, userAlignmentMessage: e.target.value } }))} className="font-mono text-[13px] min-h-[60px]" />
          </div>

          <div className="flex flex-wrap gap-4">
            {([
              ["wrap", "Wrap Sequences"],
              ["macro", "Replace Macro"],
              ["sequencesAsStopStrings", "Sequences as Stop Strings"],
              ["skipExamples", "Skip Example Formatting"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={form.instruct[key]}
                  onChange={(e) => setForm((f) => ({ ...f, instruct: { ...f.instruct, [key]: e.target.checked } }))}
                  className="rounded border-border"
                />
                {label}
              </label>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Include Names</Label>
            <Select value={form.instruct.namesBehavior} onValueChange={(v) => setForm((f) => ({ ...f, instruct: { ...f.instruct, namesBehavior: v as "none" | "force" | "always" } }))}>
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

      <InlineSection panelId="textoptions" sectionId="stopping" title="Custom Stopping Strings">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Stopping Strings (JSON array)</Label>
            <Textarea
              value={form.stoppingStrings}
              onChange={(e) => setForm((f) => ({ ...f, stoppingStrings: e.target.value }))}
              placeholder='["stop1", "stop2"]'
              className="font-mono text-[13px] min-h-[80px]"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Start Reply With</Label>
            <Textarea
              value={form.startReplyWith}
              onChange={(e) => setForm((f) => ({ ...f, startReplyWith: e.target.value }))}
              className="font-mono text-[13px] min-h-[60px]"
            />
          </div>
        </div>
      </InlineSection>

      <InlineSection panelId="textoptions" sectionId="reasoning" title="Reasoning">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[13px] font-medium">Preset</Label>
            <Select value={form.reasoning.selectedPreset} onValueChange={(v) => loadPreset("reasoning", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select preset" />
              </SelectTrigger>
              <SelectContent>
                {(reasoningPresets ?? []).map((p) => (
                  <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Prefix</Label>
              <Textarea value={form.reasoning.prefix} onChange={(e) => setForm((f) => ({ ...f, reasoning: { ...f.reasoning, prefix: e.target.value } }))} className="font-mono text-[13px] min-h-[60px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Suffix</Label>
              <Textarea value={form.reasoning.suffix} onChange={(e) => setForm((f) => ({ ...f, reasoning: { ...f.reasoning, suffix: e.target.value } }))} className="font-mono text-[13px] min-h-[60px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px] font-medium">Separator</Label>
              <Textarea value={form.reasoning.separator} onChange={(e) => setForm((f) => ({ ...f, reasoning: { ...f.reasoning, separator: e.target.value } }))} className="font-mono text-[13px] min-h-[60px]" />
            </div>
          </div>
        </div>
      </InlineSection>
    </div>
  )
}
