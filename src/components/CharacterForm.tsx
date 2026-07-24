import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  forwardRef,
  useImperativeHandle,
  type DragEvent,
} from 'react';
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
import { Camera, X, Plus, GripVertical, Upload, RefreshCw, ChevronDown } from 'lucide-react';
import { cn, estimateTokens } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { PersonaSelector } from '@/components/PersonaSelector';
import { bindCharacterPersona } from '@/lib/api';
import type { Character, CharacterCreateInput } from '@/shared/types/character';

type CharacterWithId = Character & { id: number };
type FormTab = 'overview' | 'greetings' | 'prompts' | 'advanced';

interface CharacterFormProps {
  character?: CharacterWithId | null;
  onSubmit: (
    data: CharacterCreateInput & { avatar?: string; boundPersonaId?: number | null },
  ) => void;
  onCancel: () => void;
  isSubmitting: boolean;
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

function CollapsibleCard({
  title,
  defaultExpanded = true,
  children,
}: {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card className="gap-4 py-4">
      <CardHeader className="px-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between text-left transition-colors hover:opacity-80"
        >
          <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
            {title}
          </CardTitle>
          <ChevronDown
            className={cn(
              'text-muted-foreground/40 h-4 w-4 shrink-0 transition-transform duration-200',
              expanded && 'rotate-180',
            )}
          />
        </button>
      </CardHeader>
      {expanded && <CardContent className="space-y-3 px-4">{children}</CardContent>}
    </Card>
  );
}

function CollapsibleField({
  label,
  required,
  count,
  max,
  defaultExpanded = true,
  children,
}: {
  label: string;
  required?: boolean;
  count?: number;
  max?: number;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left transition-colors hover:opacity-80"
      >
        <Label className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <div className="flex items-center gap-2">
          {count !== undefined && <CharCounter count={count} max={max} />}
          <ChevronDown
            className={cn(
              'text-muted-foreground/40 h-3 w-3 shrink-0 transition-transform duration-200',
              expanded && 'rotate-180',
            )}
          />
        </div>
      </button>
      {expanded && children}
    </div>
  );
}

export interface CharacterFormHandle {
  submit: () => void;
}

export const CharacterForm = forwardRef<CharacterFormHandle, CharacterFormProps>(
  function CharacterForm({ character, onSubmit, onCancel, isSubmitting }, ref) {
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
    const [boundPersonaId, setBoundPersonaId] = useState<number | null>(
      character?.boundPersonaId ?? null,
    );

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

    const replaceNameWithMacro = useCallback(() => {
      const charName = name.trim();
      if (!charName) return;
      const escaped = charName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?<!\\{\\{)\\b${escaped}\\b(?!\\}\\})`, 'g');
      const replacement = (prev: string) => prev.replace(regex, '{{char}}');
      setDescription(replacement);
      setPersonality(replacement);
      setScenario(replacement);
      setFirstMes(replacement);
      setMesExample(replacement);
      setCreatorNotes(replacement);
      setSystemPrompt(replacement);
      setPostHistoryInstructions(replacement);
      setAlternateGreetings((prev) => prev.map(replacement));
      setGroupOnlyGreetings((prev) => prev.map(replacement));
    }, [name]);

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
      character?.avatar ? `/api/v1/characters/avatar?id=${character.id}` : null,
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
      setAvatarPreview(character?.avatar ? `/api/v1/characters/avatar?id=${character.id}` : null);
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

    const buildDraft = useCallback((): CharacterCreateInput => {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const depthPrompt =
        depthPromptPrompt.trim().length > 0 ||
        depthPromptDepth !== 4 ||
        depthPromptRole !== 'system'
          ? { depth: depthPromptDepth, prompt: depthPromptPrompt, role: depthPromptRole }
          : undefined;

      const extensions: Record<string, unknown> = {
        ...(existingExtensions ?? {}),
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
      character?.creation_date,
      character?.modification_date,
    ]);

    // ── Submit ───────────────────────────────────────────────
    const handleSubmit = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        if (!isEdit) {
          setTouched({ name: true, firstMes: true });
          if (name.trim().length === 0 || firstMes.trim().length === 0) return;
        }

        const data: CharacterCreateInput & { avatar?: string; boundPersonaId?: number | null } = {
          ...buildDraft(),
          boundPersonaId,
        };

        if (avatarDataUrl) {
          data.avatar = avatarDataUrl;
        }

        onSubmit(data);
      },
      [isEdit, name, firstMes, buildDraft, avatarDataUrl, onSubmit, boundPersonaId],
    );

    useImperativeHandle(
      ref,
      () => ({
        submit: () => {
          handleSubmit({ preventDefault: () => {} } as React.MouseEvent<HTMLButtonElement>);
        },
      }),
      [handleSubmit],
    );

    const canSubmit = name.trim().length > 0 && firstMes.trim().length > 0 && !isSubmitting;

    const totalTokens = useMemo(() => {
      const allText = [
        name,
        description,
        personality,
        scenario,
        firstMes,
        mesExample,
        creatorNotes,
        systemPrompt,
        postHistoryInstructions,
        nickname,
        creator,
        characterVersion,
        ...alternateGreetings,
        ...groupOnlyGreetings,
      ].join(' ');
      return estimateTokens(allText);
    }, [
      name,
      description,
      personality,
      scenario,
      firstMes,
      mesExample,
      creatorNotes,
      systemPrompt,
      postHistoryInstructions,
      nickname,
      creator,
      characterVersion,
      alternateGreetings,
      groupOnlyGreetings,
    ]);

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
          </div>
          <span className="mono-tag text-muted-foreground/40 text-[10px] tabular-nums">
            ~{totalTokens.toLocaleString()} tokens
          </span>
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
            <CollapsibleCard title="Basic Info">
              <CollapsibleField label="Name" required count={name.length}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => markTouched('name')}
                  placeholder="Character name"
                  className={cn(nameError && 'border-destructive focus-visible:ring-destructive')}
                />
                {nameError && <p className="text-destructive text-xs">Name is required</p>}
              </CollapsibleField>

              <CollapsibleField label="Description" count={description.length}>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Character description"
                  rows={3}
                />
              </CollapsibleField>

              <CollapsibleField label="Personality" count={personality.length}>
                <Textarea
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  placeholder="Character personality traits"
                  rows={2}
                />
              </CollapsibleField>

              <CollapsibleField label="Scenario" count={scenario.length}>
                <Textarea
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder="Scenario context"
                  rows={2}
                />
              </CollapsibleField>
            </CollapsibleCard>

            <CollapsibleCard title="Metadata">
              <CollapsibleField label="Creator Notes" count={creatorNotes.length}>
                <Textarea
                  value={creatorNotes}
                  onChange={(e) => setCreatorNotes(e.target.value)}
                  placeholder="Notes about this character"
                  rows={2}
                />
              </CollapsibleField>

              <CollapsibleField label="Creator" count={creator.length}>
                <Input
                  value={creator}
                  onChange={(e) => setCreator(e.target.value)}
                  placeholder="Creator name"
                />
              </CollapsibleField>

              <CollapsibleField label="Version" count={characterVersion.length}>
                <Input
                  value={characterVersion}
                  onChange={(e) => setCharacterVersion(e.target.value)}
                  placeholder="e.g. 1.0"
                />
              </CollapsibleField>

              <CollapsibleField label="Tags">
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
                          className="mono-tag bg-muted/50 border-border/60 text-foreground/65 rounded-md border px-1.5 py-0.5"
                        >
                          #{tag}
                        </span>
                      ))}
                  </div>
                )}
              </CollapsibleField>
            </CollapsibleCard>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
          TAB: GREETINGS
          ═══════════════════════════════════════════════════════ */}
        {activeTab === 'greetings' && (
          <div className="space-y-5">
            <CollapsibleCard title="Greetings">
              <CollapsibleField label="First Message" required count={firstMes.length}>
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
              </CollapsibleField>

              {/* Alternate Greetings */}
              <CollapsibleField label="Alternate Greetings" count={alternateGreetings.length}>
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
              </CollapsibleField>
            </CollapsibleCard>

            {/* Group-Only Greetings */}
            <CollapsibleCard title="Group-Only Greetings">
              <CollapsibleField label="Group-Only Greetings" count={groupOnlyGreetings.length}>
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
              </CollapsibleField>
            </CollapsibleCard>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
          TAB: PROMPTS
          ═══════════════════════════════════════════════════════ */}
        {activeTab === 'prompts' && (
          <div className="space-y-5">
            <CollapsibleCard title="System Prompt">
              <CollapsibleField label="System Prompt" count={systemPrompt.length}>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Override system prompt for this character"
                  rows={3}
                />
              </CollapsibleField>

              <CollapsibleField
                label="Post-History Instructions"
                count={postHistoryInstructions.length}
              >
                <Textarea
                  value={postHistoryInstructions}
                  onChange={(e) => setPostHistoryInstructions(e.target.value)}
                  placeholder="Instructions appended after chat history"
                  rows={3}
                />
              </CollapsibleField>
            </CollapsibleCard>

            <CollapsibleCard title="Example Messages">
              <CollapsibleField label="Message Examples" count={mesExample.length}>
                <Textarea
                  value={mesExample}
                  onChange={(e) => setMesExample(e.target.value)}
                  placeholder={'<start>\n{{user}}: Hello\n{{char}}: Hi there!'}
                  rows={6}
                  className="font-mono text-xs"
                />
              </CollapsibleField>
            </CollapsibleCard>

            <CollapsibleCard title="Depth Prompt">
              <CollapsibleField label="Depth Prompt">
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
              </CollapsibleField>
            </CollapsibleCard>

            <CollapsibleCard title="Talkativeness">
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
            </CollapsibleCard>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
          TAB: ADVANCED
          ═══════════════════════════════════════════════════════ */}
        {activeTab === 'advanced' && (
          <div className="space-y-5">
            {/* Nickname */}
            <CollapsibleCard title="Identity">
              <div className="space-y-1.5">
                <FieldLabel label="Nickname" count={nickname.length} />
                <Input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Short alias for this character"
                />
              </div>
            </CollapsibleCard>

            {/* Replace Name with {{char}} */}
            <CollapsibleCard title="Macro Tools">
              <p className="text-muted-foreground mb-3 text-[13px] leading-snug">
                Find every occurrence of this character&apos;s name in all fields and replace it
                with{' '}
                <code className="bg-muted/50 rounded px-1 py-0.5 font-mono text-[12px]">{`{{char}}`}</code>
                .
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={replaceNameWithMacro}
                disabled={!name.trim()}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="mono-tag">REPLACE NAME WITH {`{{char}}`}</span>
              </Button>
            </CollapsibleCard>

            {/* Source */}
            <CollapsibleCard title="Source">
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
            </CollapsibleCard>

            {/* Creator Notes Multilingual */}
            <CollapsibleCard title="Multilingual Notes">
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
            </CollapsibleCard>

            {/* Assets */}
            <CollapsibleCard title="Assets">
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
            </CollapsibleCard>

            {/* Persona Binding */}
            <CollapsibleCard title="Persona Binding">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Bound Persona</Label>
                <PersonaSelector value={boundPersonaId} onChange={setBoundPersonaId} />
                <p className="text-muted-foreground text-xs">
                  Bind a persona to this character. When used in chats, the bound persona supersedes
                  the default persona.
                </p>
              </div>
            </CollapsibleCard>

            {/* Dates (read-only) */}
            <CollapsibleCard title="Dates" defaultExpanded={false}>
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
            </CollapsibleCard>
          </div>
        )}

        {/* ── Actions ──────────────────────────────────────── */}
        <div className="border-border/40 flex justify-end gap-2 border-t pt-2">
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
          {isEdit ? (
            avatarDataUrl ? (
              <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
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
                  <LoadingSpinner size="sm" />
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
  },
);
