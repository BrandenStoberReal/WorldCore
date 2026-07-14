import { useState, useCallback, useRef, type DragEvent } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Camera, X, Loader2, Plus, GripVertical, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Character, CharacterCreateInput } from "@/shared/types/character";

type CharacterWithId = Character & { id: number };

interface CharacterFormProps {
  character?: CharacterWithId | null;
  onSubmit: (data: CharacterCreateInput & { avatar?: string }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const EMPTY_FORM: CharacterCreateInput = {
  name: "",
  description: "",
  personality: "",
  scenario: "",
  first_mes: "",
  mes_example: "",
  creator_notes: "",
  system_prompt: "",
  post_history_instructions: "",
  tags: [],
  creator: "",
  character_version: "",
  alternate_greetings: [],
};

function CharCounter({ count, max }: { count: number; max?: number }) {
  return (
    <span className="mono-tag text-[10px] tabular-nums text-muted-foreground/40">
      {max ? `${count} / ${max}` : count}
    </span>
  );
}

function FieldLabel({
  label,
  required,
  count,
  max,
}: {
  label: string;
  required?: boolean;
  count?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {count !== undefined && <CharCounter count={count} max={max} />}
    </div>
  );
}

export function CharacterForm({ character, onSubmit, onCancel, isSubmitting }: CharacterFormProps) {
  const isEdit = !!character;

  // ── Basic state ──────────────────────────────────────────
  const [name, setName] = useState(character?.name ?? "");
  const [description, setDescription] = useState(character?.description ?? "");
  const [personality, setPersonality] = useState(character?.personality ?? "");
  const [scenario, setScenario] = useState(character?.scenario ?? "");
  const [firstMes, setFirstMes] = useState(character?.first_mes ?? "");
  const [mesExample, setMesExample] = useState(character?.mes_example ?? "");
  const [creatorNotes, setCreatorNotes] = useState(character?.creator_notes ?? "");
  const [systemPrompt, setSystemPrompt] = useState(character?.system_prompt ?? "");
  const [postHistoryInstructions, setPostHistoryInstructions] = useState(
    character?.post_history_instructions ?? "",
  );
  const [tagsInput, setTagsInput] = useState(character?.tags?.join(", ") ?? "");
  const [creator, setCreator] = useState(character?.creator ?? "");
  const [characterVersion, setCharacterVersion] = useState(character?.character_version ?? "");

  // ── Alternate greetings ──────────────────────────────────
  const [alternateGreetings, setAlternateGreetings] = useState<string[]>(
    character?.alternate_greetings ?? [],
  );

  const addGreeting = useCallback(() => {
    setAlternateGreetings((prev) => [...prev, ""]);
  }, []);

  const updateGreeting = useCallback((index: number, value: string) => {
    setAlternateGreetings((prev) => prev.map((g, i) => (i === index ? value : g)));
  }, []);

  const removeGreeting = useCallback((index: number) => {
    setAlternateGreetings((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Extensions ───────────────────────────────────────────
  const existingExtensions = character?.extensions as Record<string, unknown> | undefined;
  const existingDepthPrompt = existingExtensions?.depth_prompt as
    | { depth?: number; prompt?: string }
    | undefined;

  const [depthPromptDepth, setDepthPromptDepth] = useState(existingDepthPrompt?.depth ?? 4);
  const [depthPromptPrompt, setDepthPromptPrompt] = useState(existingDepthPrompt?.prompt ?? "");
  const [talkativeness, setTalkativeness] = useState(
    (existingExtensions?.talkativeness as number) ?? 0.5,
  );

  // ── Avatar ───────────────────────────────────────────────
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    character ? `/api/v1/characters/avatar?id=${character.id}` : null,
  );
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(undefined);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      setAvatarDataUrl(result);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleClearAvatar = useCallback(() => {
    setAvatarPreview(character ? `/api/v1/characters/avatar?id=${character.id}` : null);
    setAvatarDataUrl(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [character]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  // ── Validation ───────────────────────────────────────────
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const nameError = touched.name && name.trim().length === 0;
  const firstMesError = touched.firstMes && firstMes.trim().length === 0;

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();

      // Force-touch required fields to show errors
      setTouched({ name: true, firstMes: true });
      if (name.trim().length === 0 || firstMes.trim().length === 0) return;

      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const depthPrompt =
        depthPromptPrompt.trim().length > 0 || depthPromptDepth !== 4
          ? { depth: depthPromptDepth, prompt: depthPromptPrompt }
          : undefined;

      const extensions: Record<string, unknown> = {
        talkativeness,
      };
      if (depthPrompt) extensions.depth_prompt = depthPrompt;

      const data: CharacterCreateInput & { avatar?: string } = {
        name: name.trim(),
        description,
        personality,
        scenario,
        first_mes: firstMes,
        mes_example: mesExample,
        creator_notes: creatorNotes,
        system_prompt: systemPrompt,
        post_history_instructions: postHistoryInstructions,
        tags,
        creator,
        character_version: characterVersion,
        alternate_greetings: alternateGreetings.filter((g) => g.trim().length > 0),
        extensions,
      };

      if (avatarDataUrl) {
        data.avatar = avatarDataUrl;
      }

      onSubmit(data);
    },
    [
      name, firstMes, description, personality, scenario, mesExample,
      creatorNotes, systemPrompt, postHistoryInstructions, tagsInput,
      creator, characterVersion, alternateGreetings,
      depthPromptDepth, depthPromptPrompt, talkativeness,
      avatarDataUrl, onSubmit,
    ],
  );

  const canSubmit = name.trim().length > 0 && firstMes.trim().length > 0 && !isSubmitting;

  return (
    <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
      {/* ── Avatar upload (drag-drop) ────────────────────── */}
      <div className="flex flex-col items-center gap-3">
        <div
          role="button"
          tabIndex={0}
          className={cn(
            "relative h-28 w-28 rounded-full overflow-hidden border-2 border-dashed transition-all duration-200 cursor-pointer",
            dragOver
              ? "border-primary bg-primary/5 scale-105"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
        >
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Avatar preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
              <Upload className="h-6 w-6" />
              <span className="mono-tag text-[10px]">Drop</span>
            </div>
          )}
          {dragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-full">
              <Camera className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            Upload
          </Button>
          {avatarPreview && avatarDataUrl && (
            <Button type="button" variant="outline" size="sm" onClick={handleClearAvatar}>
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* ── Responsive 2-column grid ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* ════════════ COLUMN 1 ════════════ */}

        {/* ── Basic Info ─────────────────────────────────── */}
        <Card className="gap-4 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/60">
              Basic Info
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 space-y-3">
            <div className="space-y-1.5">
              <FieldLabel label="Name" required count={name.length} />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => markTouched("name")}
                placeholder="Character name"
                className={cn(nameError && "border-destructive focus-visible:ring-destructive")}
              />
              {nameError && (
                <p className="text-xs text-destructive">Name is required</p>
              )}
            </div>

            <div className="space-y-1.5">
              <FieldLabel label="Description" count={description.length} />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Character description"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel label="Personality" count={personality.length} />
              <Textarea
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                placeholder="Character personality traits"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel label="Scenario" count={scenario.length} />
              <Textarea
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="Scenario context"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Greetings ──────────────────────────────────── */}
        <Card className="gap-4 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/60">
              Greetings
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 space-y-3">
            <div className="space-y-1.5">
              <FieldLabel label="First Message" required count={firstMes.length} />
              <Textarea
                value={firstMes}
                onChange={(e) => setFirstMes(e.target.value)}
                onBlur={() => markTouched("firstMes")}
                placeholder="Opening greeting"
                rows={4}
                className={cn(firstMesError && "border-destructive focus-visible:ring-destructive")}
              />
              {firstMesError && (
                <p className="text-xs text-destructive">First message is required</p>
              )}
            </div>

            {/* Alternate Greetings */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Alternate Greetings</Label>
                <span className="mono-tag text-[10px] text-muted-foreground/40 tabular-nums">
                  {alternateGreetings.length}
                </span>
              </div>

              <div className="space-y-2">
                {alternateGreetings.map((greeting, i) => (
                  <div
                    key={i}
                    className="group/greeting flex gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
                  >
                    <div className="shrink-0 pt-2.5 text-muted-foreground/20">
                      <GripVertical className="h-4 w-4" />
                    </div>
                    <Textarea
                      value={greeting}
                      onChange={(e) => updateGreeting(i, e.target.value)}
                      placeholder={`Greeting #${i + 2}`}
                      rows={2}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-auto mt-1 self-start text-muted-foreground/40 hover:text-destructive opacity-0 group-hover/greeting:opacity-100 transition-opacity"
                      onClick={() => removeGreeting(i)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed"
                onClick={addGreeting}
              >
                <Plus className="h-4 w-4" />
                Add Greeting
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ════════════ COLUMN 2 ════════════ */}

        {/* ── Example Messages ───────────────────────────── */}
        <Card className="gap-4 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/60">
              Example Messages
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 space-y-1.5">
            <FieldLabel label="Message Examples" count={mesExample.length} />
            <Textarea
              value={mesExample}
              onChange={(e) => setMesExample(e.target.value)}
              placeholder={"<start>\n{{user}}: Hello\n{{char}}: Hi there!"}
              rows={6}
              className="font-mono text-xs"
            />
          </CardContent>
        </Card>

        {/* ── System Prompt ──────────────────────────────── */}
        <Card className="gap-4 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/60">
              System Prompt
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 space-y-3">
            <div className="space-y-1.5">
              <FieldLabel label="System Prompt" count={systemPrompt.length} />
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Override system prompt for this character"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="Post-History Instructions" count={postHistoryInstructions.length} />
              <Textarea
                value={postHistoryInstructions}
                onChange={(e) => setPostHistoryInstructions(e.target.value)}
                placeholder="Instructions appended after chat history"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Metadata ───────────────────────────────────── */}
        <Card className="gap-4 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/60">
              Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 space-y-3">
            <div className="space-y-1.5">
              <FieldLabel label="Creator" count={creator.length} />
              <Input
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                placeholder="Creator name"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="Creator Notes" count={creatorNotes.length} />
              <Textarea
                value={creatorNotes}
                onChange={(e) => setCreatorNotes(e.target.value)}
                placeholder="Notes about this character"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel label="Version" count={characterVersion.length} />
              <Input
                value={characterVersion}
                onChange={(e) => setCharacterVersion(e.target.value)}
                placeholder="e.g. 1.0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Tags</Label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="comma, separated, tags"
              />
              {tagsInput.trim().length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {tagsInput
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((tag, i) => (
                      <span
                        key={`${tag}-${i}`}
                        className="mono-tag px-1.5 py-0.5 rounded-sm bg-muted/50 border border-border/60 text-foreground/65"
                      >
                        #{tag}
                      </span>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Advanced ───────────────────────────────────── */}
        <Card className="gap-4 py-4 md:col-span-2">
          <CardHeader className="px-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/60">
              Advanced
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Depth Prompt */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Depth Prompt</Label>
                <div className="flex gap-2 items-end">
                  <div className="space-y-1.5 w-20 shrink-0">
                    <Label className="text-[11px] text-muted-foreground/50">Depth</Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={depthPromptDepth}
                      onChange={(e) => setDepthPromptDepth(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <Label className="text-[11px] text-muted-foreground/50">Prompt</Label>
                    <Input
                      value={depthPromptPrompt}
                      onChange={(e) => setDepthPromptPrompt(e.target.value)}
                      placeholder="Depth-based prompt injection"
                    />
                  </div>
                </div>
              </div>

              {/* Talkativeness */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Talkativeness</Label>
                  <span className="mono-tag text-[11px] tabular-nums text-muted-foreground/50">
                    {talkativeness.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={talkativeness}
                  onChange={(e) => setTalkativeness(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2
                    [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:shadow-md
                    [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground/35 mono-tag">
                  <span>Quiet</span>
                  <span>Verbose</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Actions ──────────────────────────────────────── */}
      <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {isEdit ? "Saving..." : "Creating..."}
            </>
          ) : (
            <>{isEdit ? "Save Changes" : "Create Character"}</>
          )}
        </Button>
      </div>
    </form>
  );
}


