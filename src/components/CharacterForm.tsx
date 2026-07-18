import { useState, useCallback, useRef, useEffect, type DragEvent } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Camera, X, Loader2, Plus, GripVertical, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Character, CharacterCreateInput } from '@/shared/types/character';
import type { AutoSaveStatus } from '@/hooks';

type CharacterWithId = Character & { id: number };
type FormTab = 'overview' | 'greetings' | 'prompts' | 'advanced';

interface CharacterFormProps {
  character?: CharacterWithId | null;
  onSubmit: (data: CharacterCreateInput & { avatar?: string }) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  onChange?: (draft: CharacterCreateInput) => void;
  saveStatus?: AutoSaveStatus;
}

type AssetEntry = { type: string; uri: string; name: string; ext: string };

const EMPTY_FORM: CharacterCreateInput = {
  name: '',
  description: '',
  personality: '',
  scenario: '',
  first_mes: '',
  mes_example: '',
  creator_notes: '',
  system_prompt: '',
  post_history_instructions: '',
  tags: [],
  creator: '',
  character_version: '',
  alternate_greetings: [],
  nickname: '',
  source: [],
  group_only_greetings: [],
  assets: [],
};

function CharCounter({ count, max }: { count: number; max?: number }) {
  return (
    <span className="mono-tag text-muted-foreground/40 text-[10px] tabular-nums">
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
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {count !== undefined && <CharCounter count={count} max={max} />}
    </div>
  );
}

export function CharacterForm({
  character,
  onSubmit,
  onCancel,
  isSubmitting,
  onChange,
  saveStatus,
}: CharacterFormProps) {
  const isEdit = !!character;

  // ── Tab ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<FormTab>('overview');

  // ── Basic state ──────────────────────────────────────────
  const [name, setName] = useState(character?.name ?? '');
  const [description, setDescription] = useState(character?.description ?? '');
  const [personality, setPersonality] = useState(character?.personality ?? '');
  const [scenario, setScenario] = useState(character?.scenario ?? '');
  const [firstMes, setFirstMes] = useState(character?.first_mes ?? '');
  const [mesExample, setMesExample] = useState(character?.mes_example ?? '');
  const [creatorNotes, setCreatorNotes] = useState(character?.creator_notes ?? '');
  const [systemPrompt, setSystemPrompt] = useState(character?.system_prompt ?? '');
  const [postHistoryInstructions, setPostHistoryInstructions] = useState(
    character?.post_history_instructions ?? '',
  );
  const [tagsInput, setTagsInput] = useState(character?.tags?.join(', ') ?? '');
  const [creator, setCreator] = useState(character?.creator ?? '');
  const [characterVersion, setCharacterVersion] = useState(character?.character_version ?? '');
  const [nickname, setNickname] = useState(character?.nickname ?? '');

  // ── Alternate greetings ──────────────────────────────────
  const [alternateGreetings, setAlternateGreetings] = useState<string[]>(
    character?.alternate_greetings ?? [],
  );

  const addGreeting = useCallback(() => {
    setAlternateGreetings((prev) => [...prev, '']);
  }, []);

  const updateGreeting = useCallback((index: number, value: string) => {
    setAlternateGreetings((prev) => prev.map((g, i) => (i === index ? value : g)));
  }, []);

  const removeGreeting = useCallback((index: number) => {
    setAlternateGreetings((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Group-only greetings ────────────────────────────────
  const [groupOnlyGreetings, setGroupOnlyGreetings] = useState<string[]>(
    character?.group_only_greetings ?? [],
  );

  const addGroupGreeting = useCallback(() => {
    setGroupOnlyGreetings((prev) => [...prev, '']);
  }, []);

  const updateGroupGreeting = useCallback((index: number, value: string) => {
    setGroupOnlyGreetings((prev) => prev.map((g, i) => (i === index ? value : g)));
  }, []);

  const removeGroupGreeting = useCallback((index: number) => {
    setGroupOnlyGreetings((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Source ───────────────────────────────────────────────
  const [source, setSource] = useState<string[]>(character?.source ?? []);

  const addSource = useCallback(() => {
    setSource((prev) => [...prev, '']);
  }, []);

  const updateSource = useCallback((index: number, value: string) => {
    setSource((prev) => prev.map((s, i) => (i === index ? value : s)));
  }, []);

  const removeSource = useCallback((index: number) => {
    setSource((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Assets ──────────────────────────────────────────────
  const [assets, setAssets] = useState<AssetEntry[]>(() => {
    const raw = character?.assets;
    if (!raw) return [];
    return raw.map((a) => ({ type: a.type, uri: a.uri, name: a.name, ext: a.ext }));
  });

  const addAsset = useCallback(() => {
    setAssets((prev) => [...prev, { type: '', uri: '', name: '', ext: '' }]);
  }, []);

  const updateAsset = useCallback((index: number, field: keyof AssetEntry, value: string) => {
    setAssets((prev) => prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  }, []);

  const removeAsset = useCallback((index: number) => {
    setAssets((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Creator notes multilingual ──────────────────────────
  const [multiLangNotes, setMultiLangNotes] = useState<Array<{ lang: string; value: string }>>(
    () => {
      const map = character?.creator_notes_multilingual;
      if (!map) return [];
      return Object.entries(map).map(([lang, value]) => ({ lang, value }));
    },
  );

  const addLangNote = useCallback(() => {
    setMultiLangNotes((prev) => [...prev, { lang: '', value: '' }]);
  }, []);

  const updateLangNote = useCallback((index: number, field: 'lang' | 'value', value: string) => {
    setMultiLangNotes((prev) => prev.map((n, i) => (i === index ? { ...n, [field]: value } : n)));
  }, []);

  const removeLangNote = useCallback((index: number) => {
    setMultiLangNotes((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ── Extensions ───────────────────────────────────────────
  const existingExtensions = character?.extensions as Record<string, unknown> | undefined;
  const existingDepthPrompt = existingExtensions?.depth_prompt as
    { depth?: number; prompt?: string; role?: string } | undefined;

  const [depthPromptDepth, setDepthPromptDepth] = useState(existingDepthPrompt?.depth ?? 4);
  const [depthPromptPrompt, setDepthPromptPrompt] = useState(existingDepthPrompt?.prompt ?? '');
  const [depthPromptRole, setDepthPromptRole] = useState<string>(
    existingDepthPrompt?.role ?? 'system',
  );
  const [talkativeness, setTalkativeness] = useState(
    (existingExtensions?.talkativeness as number) ?? 0.5,
  );

  // ── Avatar ───────────────────────────────────────────────
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    character ? `/api/v1/characters/avatar?id=${character.id}` : null,
  );
  const [avatarPreviewError, setAvatarPreviewError] = useState(false);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(undefined);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      setAvatarPreviewError(false);
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
    setAvatarPreviewError(false);
    setAvatarDataUrl(undefined);
    if (fileInputRef.current) fileInputRef.current.value = '';
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

  // ── Autosave ─────────────────────────────────────────────
  const autosaveActive = !!character && !!onChange;

  const buildDraft = useCallback((): CharacterCreateInput => {
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const depthPrompt =
      depthPromptPrompt.trim().length > 0 || depthPromptDepth !== 4 || depthPromptRole !== 'system'
        ? { depth: depthPromptDepth, prompt: depthPromptPrompt, role: depthPromptRole }
        : undefined;

    const extensions: Record<string, unknown> = {
      talkativeness,
    };
    if (depthPrompt) extensions.depth_prompt = depthPrompt;

    const creatorNotesMap = multiLangNotes.reduce<Record<string, string>>(
      (acc, { lang, value }) => {
        if (lang.trim()) acc[lang.trim()] = value;
        return acc;
      },
      {},
    );

    return {
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
      nickname: nickname || undefined,
      creator_notes_multilingual:
        Object.keys(creatorNotesMap).length > 0 ? creatorNotesMap : undefined,
      source: source.filter((s) => s.trim().length > 0),
      group_only_greetings: groupOnlyGreetings.filter((g) => g.trim().length > 0),
      assets: assets.filter((a) => a.uri.trim().length > 0 || a.name.trim().length > 0),
      extensions,
      ...(character?.creation_date != null && { creation_date: character.creation_date }),
      ...(character?.modification_date != null && {
        modification_date: character.modification_date,
      }),
    };
  }, [
    name,
    firstMes,
    description,
    personality,
    scenario,
    mesExample,
    creatorNotes,
    systemPrompt,
    postHistoryInstructions,
    tagsInput,
    creator,
    characterVersion,
    alternateGreetings,
    nickname,
    source,
    groupOnlyGreetings,
    assets,
    multiLangNotes,
    depthPromptDepth,
    depthPromptPrompt,
    depthPromptRole,
    talkativeness,
    character,
  ]);

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    if (!autosaveActive) return;
    onChangeRef.current?.(buildDraft());
  }, [autosaveActive, buildDraft]);

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();

      if (!isEdit) {
        setTouched({ name: true, firstMes: true });
        if (name.trim().length === 0 || firstMes.trim().length === 0) return;
      }

      const data: CharacterCreateInput & { avatar?: string } = {
        ...buildDraft(),
      };

      if (avatarDataUrl) {
        data.avatar = avatarDataUrl;
      }

      onSubmit(data);
    },
    [isEdit, name, firstMes, buildDraft, avatarDataUrl, onSubmit],
  );

  const canSubmit = name.trim().length > 0 && firstMes.trim().length > 0 && !isSubmitting;

  // ── Tab definitions ─────────────────────────────────────
  const TABS: Array<{ key: FormTab; label: string }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'greetings', label: 'Greetings' },
    { key: 'prompts', label: 'Prompts' },
    { key: 'advanced', label: 'Advanced' },
  ];

  return (
    <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
      {/* ── Avatar upload (drag-drop) ────────────────────── */}
      <div className="flex flex-col items-center gap-3">
        <div
          role="button"
          tabIndex={0}
          className={cn(
            'relative h-28 w-28 cursor-pointer overflow-hidden rounded-full border-2 border-dashed transition-all duration-200',
            dragOver
              ? 'border-primary bg-primary/5 scale-105'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
          }}
        >
          {avatarPreview && !avatarPreviewError ? (
            <img
              src={avatarPreview}
              alt="Avatar preview"
              className="h-full w-full object-cover"
              onError={() => setAvatarPreviewError(true)}
            />
          ) : (
            <div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-1">
              <Upload className="h-6 w-6" />
              <span className="mono-tag text-[10px]">Drop</span>
            </div>
          )}
          {dragOver && (
            <div className="bg-primary/10 absolute inset-0 flex items-center justify-center rounded-full">
              <Camera className="text-primary h-6 w-6" />
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
        <div className="flex items-center gap-2">
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
          {isEdit && autosaveActive && saveStatus && saveStatus !== 'idle' && (
            <span
              className={cn(
                'mono-tag text-[10px]',
                saveStatus === 'error' ? 'text-destructive' : 'text-muted-foreground/40',
              )}
            >
              {saveStatus}
            </span>
          )}
        </div>
      </div>

      {/* ── Tab strip ────────────────────────────────────── */}
      <div className="border-border/40 flex gap-1 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={cn(
              'mono-tag -mb-px px-3 py-2 text-[10px] tracking-wider uppercase transition-colors',
              activeTab === tab.key
                ? 'text-ember border-ember border-b-2'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════
          TAB: OVERVIEW
          ═══════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <Card className="gap-4 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
                Basic Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4">
              <div className="space-y-1.5">
                <FieldLabel label="Name" required count={name.length} />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => markTouched('name')}
                  placeholder="Character name"
                  className={cn(nameError && 'border-destructive focus-visible:ring-destructive')}
                />
                {nameError && <p className="text-destructive text-xs">Name is required</p>}
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

          <Card className="gap-4 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4">
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
                <FieldLabel label="Creator" count={creator.length} />
                <Input
                  value={creator}
                  onChange={(e) => setCreator(e.target.value)}
                  placeholder="Creator name"
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
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((tag, i) => (
                        <span
                          key={`${tag}-${i}`}
                          className="mono-tag bg-muted/50 border-border/60 text-foreground/65 rounded-sm border px-1.5 py-0.5"
                        >
                          #{tag}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB: GREETINGS
          ═══════════════════════════════════════════════════════ */}
      {activeTab === 'greetings' && (
        <div className="space-y-5">
          <Card className="gap-4 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
                Greetings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4">
              <div className="space-y-1.5">
                <FieldLabel label="First Message" required count={firstMes.length} />
                <Textarea
                  value={firstMes}
                  onChange={(e) => setFirstMes(e.target.value)}
                  onBlur={() => markTouched('firstMes')}
                  placeholder="Opening greeting"
                  rows={4}
                  className={cn(
                    firstMesError && 'border-destructive focus-visible:ring-destructive',
                  )}
                />
                {firstMesError && (
                  <p className="text-destructive text-xs">First message is required</p>
                )}
              </div>

              {/* Alternate Greetings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Alternate Greetings</Label>
                  <span className="mono-tag text-muted-foreground/40 text-[10px] tabular-nums">
                    {alternateGreetings.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {alternateGreetings.map((greeting, i) => (
                    <div
                      key={i}
                      className="group/greeting animate-in fade-in slide-in-from-top-1 flex gap-2 duration-200"
                    >
                      <div className="text-muted-foreground/20 shrink-0 pt-2.5">
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
                        className="text-muted-foreground/40 hover:text-destructive mt-1 h-auto shrink-0 self-start opacity-0 transition-opacity group-hover/greeting:opacity-100"
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

          {/* Group-Only Greetings */}
          <Card className="gap-4 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
                Group-Only Greetings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Group-Only Greetings</Label>
                  <span className="mono-tag text-muted-foreground/40 text-[10px] tabular-nums">
                    {groupOnlyGreetings.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {groupOnlyGreetings.map((greeting, i) => (
                    <div
                      key={i}
                      className="group/greeting animate-in fade-in slide-in-from-top-1 flex gap-2 duration-200"
                    >
                      <div className="text-muted-foreground/20 shrink-0 pt-2.5">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <Textarea
                        value={greeting}
                        onChange={(e) => updateGroupGreeting(i, e.target.value)}
                        placeholder={`Group Greeting #${i + 1}`}
                        rows={2}
                        className="flex-1"
                      />
                      <div className="flex shrink-0 flex-col items-center gap-1 pt-1">
                        <CharCounter count={greeting.length} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground/40 hover:text-destructive mt-1 h-auto shrink-0 self-start opacity-0 transition-opacity group-hover/greeting:opacity-100"
                          onClick={() => removeGroupGreeting(i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed"
                  onClick={addGroupGreeting}
                >
                  <Plus className="h-4 w-4" />
                  Add Group Greeting
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB: PROMPTS
          ═══════════════════════════════════════════════════════ */}
      {activeTab === 'prompts' && (
        <div className="space-y-5">
          <Card className="gap-4 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
                System Prompt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4">
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
                <FieldLabel
                  label="Post-History Instructions"
                  count={postHistoryInstructions.length}
                />
                <Textarea
                  value={postHistoryInstructions}
                  onChange={(e) => setPostHistoryInstructions(e.target.value)}
                  placeholder="Instructions appended after chat history"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="gap-4 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
                Example Messages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 px-4">
              <FieldLabel label="Message Examples" count={mesExample.length} />
              <Textarea
                value={mesExample}
                onChange={(e) => setMesExample(e.target.value)}
                placeholder={'<start>\n{{user}}: Hello\n{{char}}: Hi there!'}
                rows={6}
                className="font-mono text-xs"
              />
            </CardContent>
          </Card>

          <Card className="gap-4 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
                Depth Prompt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Depth Prompt</Label>
                <div className="grid grid-cols-[5rem_1fr_8rem] items-end gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground/50 text-[11px]">Depth</Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={depthPromptDepth}
                      onChange={(e) => setDepthPromptDepth(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground/50 text-[11px]">Prompt</Label>
                    <Input
                      value={depthPromptPrompt}
                      onChange={(e) => setDepthPromptPrompt(e.target.value)}
                      placeholder="Depth-based prompt injection"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground/50 text-[11px]">Role</Label>
                    <Select
                      value={depthPromptRole}
                      onValueChange={(v) => {
                        if (v === 'system' || v === 'user' || v === 'assistant') {
                          setDepthPromptRole(v);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">system</SelectItem>
                        <SelectItem value="user">user</SelectItem>
                        <SelectItem value="assistant">assistant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-4 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
                Talkativeness
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Talkativeness</Label>
                  <span className="mono-tag text-muted-foreground/50 text-[11px] tabular-nums">
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
                  className="bg-muted [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-background h-1.5 w-full cursor-pointer appearance-none rounded-full [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125"
                />
                <div className="text-muted-foreground/35 mono-tag flex justify-between text-[10px]">
                  <span>Quiet</span>
                  <span>Verbose</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB: ADVANCED
          ═══════════════════════════════════════════════════════ */}
      {activeTab === 'advanced' && (
        <div className="space-y-5">
          {/* Nickname */}
          <Card className="gap-4 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
                Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4">
              <div className="space-y-1.5">
                <FieldLabel label="Nickname" count={nickname.length} />
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Short alias for this character"
                />
              </div>
            </CardContent>
          </Card>

          {/* Source */}
          <Card className="gap-4 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
                Source
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Source URLs</Label>
                  <span className="mono-tag text-muted-foreground/40 text-[10px] tabular-nums">
                    {source.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {source.map((src, i) => (
                    <div
                      key={i}
                      className="group/src animate-in fade-in slide-in-from-top-1 flex gap-2 duration-200"
                    >
                      <div className="text-muted-foreground/20 shrink-0 pt-2.5">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <Textarea
                        value={src}
                        onChange={(e) => updateSource(i, e.target.value)}
                        placeholder={`Source URL #${i + 1}`}
                        rows={1}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground/40 hover:text-destructive mt-1 h-auto shrink-0 self-start opacity-0 transition-opacity group-hover/src:opacity-100"
                        onClick={() => removeSource(i)}
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
                  onClick={addSource}
                >
                  <Plus className="h-4 w-4" />
                  Add Source
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Creator Notes Multilingual */}
          <Card className="gap-4 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
                Multilingual Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Creator Notes (Multilingual)</Label>
                  <span className="mono-tag text-muted-foreground/40 text-[10px] tabular-nums">
                    {multiLangNotes.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {multiLangNotes.map((note, i) => (
                    <div
                      key={i}
                      className="group/note animate-in fade-in slide-in-from-top-1 flex gap-2 duration-200"
                    >
                      <Input
                        value={note.lang}
                        onChange={(e) => updateLangNote(i, 'lang', e.target.value)}
                        placeholder="en"
                        className="w-16 shrink-0"
                      />
                      <Textarea
                        value={note.value}
                        onChange={(e) => updateLangNote(i, 'value', e.target.value)}
                        placeholder="Translated creator notes..."
                        rows={2}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground/40 hover:text-destructive mt-1 h-auto shrink-0 self-start opacity-0 transition-opacity group-hover/note:opacity-100"
                        onClick={() => removeLangNote(i)}
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
                  onClick={addLangNote}
                >
                  <Plus className="h-4 w-4" />
                  Add Language
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Assets */}
          <Card className="gap-4 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
                Assets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Character Assets</Label>
                  <span className="mono-tag text-muted-foreground/40 text-[10px] tabular-nums">
                    {assets.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {assets.map((asset, i) => (
                    <div
                      key={i}
                      className="group/asset animate-in fade-in slide-in-from-top-1 duration-200"
                    >
                      <div className="flex items-start gap-2">
                        <div className="text-muted-foreground/20 shrink-0 pt-2.5">
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
                          <Input
                            value={asset.type}
                            onChange={(e) => updateAsset(i, 'type', e.target.value)}
                            placeholder="Type"
                          />
                          <Input
                            value={asset.uri}
                            onChange={(e) => updateAsset(i, 'uri', e.target.value)}
                            placeholder="URI"
                          />
                          <Input
                            value={asset.name}
                            onChange={(e) => updateAsset(i, 'name', e.target.value)}
                            placeholder="Name"
                          />
                          <Input
                            value={asset.ext}
                            onChange={(e) => updateAsset(i, 'ext', e.target.value)}
                            placeholder="Ext"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground/40 hover:text-destructive mt-1 h-auto shrink-0 self-start opacity-0 transition-opacity group-hover/asset:opacity-100"
                          onClick={() => removeAsset(i)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-dashed"
                  onClick={addAsset}
                >
                  <Plus className="h-4 w-4" />
                  Add Asset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Dates (read-only) */}
          <Card className="gap-4 py-4">
            <CardHeader className="px-4">
              <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
                Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Creation Date</Label>
                <Input
                  disabled
                  readOnly
                  value={
                    character?.creation_date
                      ? new Date(character.creation_date).toISOString()
                      : 'N/A'
                  }
                  className="mono-tag"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Last Modified</Label>
                <Input
                  disabled
                  readOnly
                  value={
                    character?.modification_date
                      ? new Date(character.modification_date).toISOString()
                      : 'N/A'
                  }
                  className="mono-tag"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Actions ──────────────────────────────────────── */}
      <div className="border-border/40 flex justify-end gap-2 border-t pt-2">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancel
        </Button>
        {isEdit && autosaveActive ? (
          avatarDataUrl ? (
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Avatar'
              )}
            </Button>
          ) : null
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isEdit ? 'Saving...' : 'Creating...'}
              </>
            ) : (
              <>{isEdit ? 'Save Changes' : 'Create Character'}</>
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
