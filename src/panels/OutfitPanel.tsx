import { useState, useCallback, useEffect, useMemo } from 'react';
import { Shirt, Plus, Trash2, ChevronDown } from 'lucide-react';
import { useChatStore } from '@/lib/stores';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Character } from '@/shared/types/character';

type BodySlot =
  | 'head' | 'face' | 'neck'
  | 'undergarment_top' | 'torso_top' | 'torso_outer' | 'arms' | 'hands'
  | 'undergarment_bottom' | 'lower_body' | 'legs'
  | 'socks' | 'feet' | 'accessories';

const SLOT_LABELS: Record<BodySlot, string> = {
  head: 'Head', face: 'Face', neck: 'Neck',
  undergarment_top: 'Under Top', torso_top: 'Top', torso_outer: 'Outer Layer',
  arms: 'Arms', hands: 'Hands',
  undergarment_bottom: 'Under Bottom', lower_body: 'Lower Body', legs: 'Legs',
  socks: 'Socks', feet: 'Feet', accessories: 'Accessories',
};

const SLOT_PLACEHOLDERS: Record<BodySlot, string> = {
  head: 'hat, headband, tiara...',
  face: 'glasses, mask, veil...',
  neck: 'necklace, scarf, choker...',
  undergarment_top: 'bra, undershirt, camisole...',
  torso_top: 'shirt, blouse, tunic...',
  torso_outer: 'jacket, coat, sweater, armor...',
  arms: 'gloves, bracers, arm warmers...',
  hands: 'rings, bracelets, hand wraps...',
  undergarment_bottom: 'underwear, boxers, panties...',
  lower_body: 'pants, skirt, shorts, kilt...',
  legs: 'stockings, leggings, tights...',
  socks: 'socks, ankle warmers...',
  feet: 'shoes, boots, sandals, heels...',
  accessories: 'belt, wings, tail, cape...',
};

const ALL_SLOTS: BodySlot[] = [
  'head', 'face', 'neck',
  'undergarment_top', 'torso_top', 'torso_outer', 'arms', 'hands',
  'undergarment_bottom', 'lower_body', 'legs',
  'socks', 'feet', 'accessories',
];

interface CustomField {
  id: string;
  label: string;
  placeholder: string;
}

interface CustomPanel {
  id: string;
  label: string;
  color: string;
  accent: string;
  fields: CustomField[];
}

interface BuiltInRegion {
  id: string;
  label: string;
  color: string;
  accent: string;
  slots: BodySlot[];
  customFields: CustomField[];
}

const REGION_STYLES = [
  { color: 'border-t-violet-500/40', accent: 'text-violet-400' },
  { color: 'border-t-blue-500/40', accent: 'text-blue-400' },
  { color: 'border-t-cyan-500/40', accent: 'text-cyan-400' },
  { color: 'border-t-emerald-500/40', accent: 'text-emerald-400' },
  { color: 'border-t-amber-500/40', accent: 'text-amber-400' },
  { color: 'border-t-rose-500/40', accent: 'text-rose-400' },
  { color: 'border-t-pink-500/40', accent: 'text-pink-400' },
  { color: 'border-t-orange-500/40', accent: 'text-orange-400' },
];

function makeDefaultRegions(): BuiltInRegion[] {
  return [
    { id: 'head', label: 'Head', color: 'border-t-violet-500/40', accent: 'text-violet-400', slots: ['head', 'face'], customFields: [] },
    { id: 'upper', label: 'Upper Body', color: 'border-t-blue-500/40', accent: 'text-blue-400', slots: ['neck', 'undergarment_top', 'torso_top', 'torso_outer'], customFields: [] },
    { id: 'arms', label: 'Arms & Hands', color: 'border-t-cyan-500/40', accent: 'text-cyan-400', slots: ['arms', 'hands'], customFields: [] },
    { id: 'lower', label: 'Lower Body', color: 'border-t-emerald-500/40', accent: 'text-emerald-400', slots: ['undergarment_bottom', 'lower_body', 'legs'], customFields: [] },
    { id: 'feet', label: 'Feet', color: 'border-t-amber-500/40', accent: 'text-amber-400', slots: ['socks', 'feet'], customFields: [] },
    { id: 'acc', label: 'Accessories', color: 'border-t-rose-500/40', accent: 'text-rose-400', slots: ['accessories'], customFields: [] },
  ];
}

function emptyOutfit(): Record<string, string> {
  const items: Record<string, string> = {};
  for (const s of ALL_SLOTS) items[s] = '';
  return items;
}

function formatOutfitForPrompt(items: Record<string, string>, regions: BuiltInRegion[], customPanels: CustomPanel[]): string {
  const lines: string[] = [];
  for (const region of regions) {
    const regionLines: string[] = [];
    for (const slot of region.slots) {
      const desc = items[slot];
      if (desc?.trim()) regionLines.push(`- ${SLOT_LABELS[slot]}: ${desc}`);
    }
    for (const cf of region.customFields) {
      const desc = items[cf.id];
      if (desc?.trim()) regionLines.push(`- ${cf.label}: ${desc}`);
    }
    if (regionLines.length > 0) {
      lines.push(`[${region.label}]`);
      lines.push(...regionLines);
    }
  }
  for (const panel of customPanels) {
    const panelLines: string[] = [];
    for (const cf of panel.fields) {
      const desc = items[cf.id];
      if (desc?.trim()) panelLines.push(`- ${cf.label}: ${desc}`);
    }
    if (panelLines.length > 0) {
      lines.push(`[${panel.label}]`);
      lines.push(...panelLines);
    }
  }
  return lines.length > 0 ? lines.join('\n') : '(no outfit specified)';
}

interface OutfitPreset {
  id: string;
  name: string;
  items: Record<string, string>;
  regions: BuiltInRegion[];
  customPanels: CustomPanel[];
  createdAt: number;
  greetingIndex?: number; // undefined = default greeting, 0+ = alternate greeting index
}

function nextColorIndex(regions: BuiltInRegion[], customPanels: CustomPanel[]): number {
  return (regions.length + customPanels.length) % REGION_STYLES.length;
}

let fieldCounter = 0;
function newFieldId(): string {
  return `cf-${Date.now()}-${++fieldCounter}`;
}

export function OutfitPanel() {
  const characterId = useChatStore((s) => s.activeCharacterId);
  const [outfit, setOutfit] = useState<Record<string, string>>(emptyOutfit);
  const [savedOutfit, setSavedOutfit] = useState<Record<string, string>>(emptyOutfit);
  const [regions, setRegions] = useState<BuiltInRegion[]>(makeDefaultRegions);
  const [savedRegions, setSavedRegions] = useState<BuiltInRegion[]>(makeDefaultRegions);
  const [customPanels, setCustomPanels] = useState<CustomPanel[]>([]);
  const [savedCustomPanels, setSavedCustomPanels] = useState<CustomPanel[]>([]);
  const [presets, setPresets] = useState<OutfitPreset[]>([]);
  const [savedPresets, setSavedPresets] = useState<OutfitPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [savedDisabled, setSavedDisabled] = useState(false);
  const [selectedGreetingIndex, setSelectedGreetingIndex] = useState<number | undefined>(undefined);
  const [showSidebar, setShowSidebar] = useState(false);

  const { data: character } = useQuery<Character & { id: number }>({
    queryKey: ['/api/v1/characters/get', characterId],
    queryFn: () =>
      apiFetch('/characters/get', {
        method: 'POST',
        body: JSON.stringify({ id: characterId }),
      }) as Promise<Character & { id: number }>,
    enabled: characterId !== null,
  });

  const greetingsList = useMemo(() => {
    if (!character) return [];
    const list: string[] = [];
    if (character.first_mes?.trim()) {
      list.push(character.first_mes);
    }
    for (const g of character.alternate_greetings ?? []) {
      if (g?.trim()) list.push(g);
    }
    return list;
  }, [character]);

  useEffect(() => {
    if (characterId === null) return;
    const key = `worldcore/outfit/${characterId}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        const items = data.items ?? emptyOutfit();
        const rgs = data.regions ?? makeDefaultRegions();
        const cps = data.customPanels ?? [];
        const prs = data.presets ?? [];
        const dis = data.disabled ?? false;
        setOutfit(items);
        setSavedOutfit(items);
        setRegions(rgs);
        setSavedRegions(rgs);
        setCustomPanels(cps);
        setSavedCustomPanels(cps);
        setPresets(prs);
        setSavedPresets(prs);
        setDisabled(dis);
        setSavedDisabled(dis);
      } else {
        resetAll();
      }
    } catch {
      resetAll();
    }
  }, [characterId]);

  function resetAll() {
    const e = emptyOutfit();
    const r = makeDefaultRegions();
    setOutfit(e);
    setSavedOutfit(e);
    setRegions(r);
    setSavedRegions(r);
    setCustomPanels([]);
    setSavedCustomPanels([]);
    setPresets([]);
    setSavedPresets([]);
    setDisabled(false);
    setSavedDisabled(false);
  }

  const saveToStorage = useCallback(() => {
    if (characterId === null) return;
    const key = `worldcore/outfit/${characterId}`;
    localStorage.setItem(key, JSON.stringify({
      items: outfit,
      regions,
      customPanels,
      presets,
      disabled,
    }));
    setSavedOutfit(outfit);
    setSavedRegions(regions);
    setSavedCustomPanels(customPanels);
    setSavedPresets(presets);
    setSavedDisabled(disabled);
  }, [characterId, outfit, regions, customPanels, presets, disabled]);

  const handleSave = useCallback(() => {
    setSaveStatus('saving');
    saveToStorage();
    setTimeout(() => setSaveStatus('saved'), 100);
    setTimeout(() => setSaveStatus('idle'), 2000);
  }, [saveToStorage]);

  const isDirty = useMemo(() => {
    return JSON.stringify(outfit) !== JSON.stringify(savedOutfit) ||
           JSON.stringify(regions) !== JSON.stringify(savedRegions) ||
           JSON.stringify(customPanels) !== JSON.stringify(savedCustomPanels) ||
           JSON.stringify(presets) !== JSON.stringify(savedPresets) ||
           disabled !== savedDisabled;
  }, [outfit, regions, customPanels, presets, disabled, savedOutfit, savedRegions, savedCustomPanels, savedPresets, savedDisabled]);

  const handleSlotChange = useCallback((slot: string, value: string) => {
    setOutfit((prev) => ({ ...prev, [slot]: value }));
  }, []);

  const handleAddCustomField = useCallback((panelId: string, isCustom: boolean) => {
    const field: CustomField = { id: newFieldId(), label: 'New Field', placeholder: '...' };
    if (isCustom) {
      setCustomPanels((prev) => prev.map((p) =>
        p.id === panelId ? { ...p, fields: [...p.fields, field] } : p
      ));
    } else {
      setRegions((prev) => prev.map((r) =>
        r.id === panelId ? { ...r, customFields: [...r.customFields, field] } : r
      ));
    }
    setOutfit((prev) => ({ ...prev, [field.id]: '' }));
  }, []);

  const handleRemoveCustomField = useCallback((panelId: string, fieldId: string, isCustom: boolean) => {
    if (isCustom) {
      setCustomPanels((prev) => prev.map((p) =>
        p.id === panelId ? { ...p, fields: p.fields.filter((f) => f.id !== fieldId) } : p
      ));
    } else {
      setRegions((prev) => prev.map((r) =>
        r.id === panelId ? { ...r, customFields: r.customFields.filter((f) => f.id !== fieldId) } : r
      ));
    }
    setOutfit((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const handleUpdateFieldLabel = useCallback((panelId: string, fieldId: string, label: string, isCustom: boolean) => {
    const update = (fields: CustomField[]) => fields.map((f) => f.id === fieldId ? { ...f, label } : f);
    if (isCustom) {
      setCustomPanels((prev) => prev.map((p) =>
        p.id === panelId ? { ...p, fields: update(p.fields) } : p
      ));
    } else {
      setRegions((prev) => prev.map((r) =>
        r.id === panelId ? { ...r, customFields: update(r.customFields) } : r
      ));
    }
  }, []);

  const handleAddCustomPanel = useCallback(() => {
    const colorIdx = nextColorIndex(regions, customPanels);
    const style = REGION_STYLES[colorIdx]!;
    const panel: CustomPanel = {
      id: `cp-${Date.now()}`,
      label: 'Custom Panel',
      color: style.color,
      accent: style.accent,
      fields: [],
    };
    setCustomPanels((prev) => [...prev, panel]);
  }, [regions, customPanels]);

  const handleRemoveCustomPanel = useCallback((panelId: string) => {
    setCustomPanels((prev) => {
      const panel = prev.find((p) => p.id === panelId);
      if (panel) {
        setOutfit((items) => {
          const next = { ...items };
          for (const f of panel.fields) delete next[f.id];
          return next;
        });
      }
      return prev.filter((p) => p.id !== panelId);
    });
  }, []);

  const handleUpdatePanelLabel = useCallback((panelId: string, label: string) => {
    setCustomPanels((prev) => prev.map((p) =>
      p.id === panelId ? { ...p, label } : p
    ));
  }, []);

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const preset: OutfitPreset = {
      id: `preset-${Date.now()}`,
      name: presetName.trim(),
      items: { ...outfit },
      regions: JSON.parse(JSON.stringify(regions)),
      customPanels: JSON.parse(JSON.stringify(customPanels)),
      createdAt: Date.now(),
      greetingIndex: selectedGreetingIndex,
    };
    setPresets((prev) => [...prev, preset]);
    setPresetName('');
    setSelectedGreetingIndex(undefined);
  }, [presetName, outfit, regions, customPanels, selectedGreetingIndex]);

  const handleApplyPreset = useCallback((presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    const merged = { ...emptyOutfit(), ...preset.items };
    setOutfit(merged);
    if (preset.regions) setRegions(preset.regions);
    if (preset.customPanels) setCustomPanels(preset.customPanels);
  }, [presets]);

  const handleDeletePreset = useCallback((presetId: string) => {
    setPendingDeleteId(presetId);
  }, []);

  const confirmDeletePreset = useCallback(() => {
    if (pendingDeleteId) {
      setPresets((prev) => prev.filter((p) => p.id !== pendingDeleteId));
      setPendingDeleteId(null);
    }
  }, [pendingDeleteId]);

  const cancelDeletePreset = useCallback(() => {
    setPendingDeleteId(null);
  }, []);

  const promptPreview = useMemo(() => formatOutfitForPrompt(outfit, regions, customPanels), [outfit, regions, customPanels]);

  const filledCount = useMemo(() => {
    let count = 0;
    for (const s of ALL_SLOTS) if (outfit[s]?.trim()) count++;
    for (const r of regions) for (const f of r.customFields) if (outfit[f.id]?.trim()) count++;
    for (const cp of customPanels) for (const f of cp.fields) if (outfit[f.id]?.trim()) count++;
    return count;
  }, [outfit, regions, customPanels]);

  const totalFieldCount = useMemo(() => {
    let count = ALL_SLOTS.length;
    for (const r of regions) count += r.customFields.length;
    for (const cp of customPanels) count += cp.fields.length;
    return count;
  }, [regions, customPanels]);

  if (characterId === null) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">Select a character to manage their outfit.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden md:flex-row">
      <div className="flex-1 overflow-y-auto p-4">
        {disabled ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Shirt className="text-muted-foreground/40 mb-4 h-12 w-12" />
            <h3 className="text-muted-foreground text-sm font-medium">Outfit Disabled</h3>
            <p className="text-muted-foreground/60 mt-1 max-w-xs text-xs">
              Toggle the switch in the sidebar to enable outfit tracking.
            </p>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowSidebar(!showSidebar)}
              className="md:hidden border-border/60 bg-background/60 hover:bg-accent/40 mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors"
            >
              <span className="text-muted-foreground">{showSidebar ? 'Hide' : 'Show'} Settings</span>
              <span className="mono-tag text-foreground/60">{filledCount}/{totalFieldCount}</span>
            </button>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {regions.map((region) => (
                <RegionCard
                  key={region.id}
                  region={region}
                  outfit={outfit}
                  onSlotChange={handleSlotChange}
                  onAddField={() => handleAddCustomField(region.id, false)}
                  onRemoveField={(fieldId) => handleRemoveCustomField(region.id, fieldId, false)}
                  onUpdateFieldLabel={(fieldId, label) => handleUpdateFieldLabel(region.id, fieldId, label, false)}
                />
              ))}
              {customPanels.map((panel) => (
                <CustomPanelCard
                  key={panel.id}
                  panel={panel}
                  outfit={outfit}
                  onSlotChange={handleSlotChange}
                  onAddField={() => handleAddCustomField(panel.id, true)}
                  onRemoveField={(fieldId) => handleRemoveCustomField(panel.id, fieldId, true)}
                  onUpdateFieldLabel={(fieldId, label) => handleUpdateFieldLabel(panel.id, fieldId, label, true)}
                  onUpdateLabel={(label) => handleUpdatePanelLabel(panel.id, label)}
                  onRemove={() => handleRemoveCustomPanel(panel.id)}
                />
              ))}
              <button
                type="button"
                onClick={handleAddCustomPanel}
                className="border-border/30 hover:border-border/60 hover:bg-muted/20 flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors"
              >
                <Plus className="text-muted-foreground/40 h-5 w-5" />
                <span className="text-muted-foreground/50 text-[10px] font-medium uppercase tracking-wider">
                  Add Panel
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      <div className={cn(
        "flex w-full shrink-0 flex-col overflow-y-auto border-t md:w-72 md:border-t-0 md:border-l",
        !showSidebar && "hidden md:flex"
      )}>
        <div className="space-y-3 border-b p-4">
          <div className="flex items-center justify-between">
            <span className="text-foreground/80 text-xs font-medium">
              {filledCount}/{totalFieldCount} filled
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrompt(!showPrompt)}
                className="text-muted-foreground hover:text-foreground touch-target rounded px-2 py-1 text-[10px] transition-colors"
              >
                {showPrompt ? 'Hide' : 'Show'} Prompt
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || saveStatus === 'saving'}
                className={`touch-target rounded px-3 py-1 text-[10px] font-medium transition-colors ${
                  isDirty
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={disabled}
            onClick={() => setDisabled(!disabled)}
            className="touch-target flex w-full items-center justify-between rounded px-1 text-left transition-colors hover:bg-accent/30 sm:w-auto sm:gap-2"
          >
            <span className="text-muted-foreground text-[10px]">Disabled</span>
            <span
              className={`relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                disabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
                  disabled ? 'translate-x-3' : 'translate-x-0'
                }`}
              />
            </span>
          </button>
        </div>

        {showPrompt && (
          <div className="border-b p-4">
            <h3 className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wider">
              Prompt Context
            </h3>
            <pre className="text-foreground/80 max-h-32 overflow-y-auto whitespace-pre-wrap text-[10px]">
              {promptPreview}
            </pre>
          </div>
        )}

        <div className="flex flex-1 flex-col p-4">
          <h3 className="text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-wider">
            Presets
          </h3>
          <div className="mb-3 space-y-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Preset name..."
              aria-label="Preset name"
              className="bg-background/50 border-border/50 focus:border-primary/50 w-full rounded border px-2 py-1 text-[11px] transition-colors placeholder:text-muted-foreground/40"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSavePreset(); }}
            />
            {greetingsList.length > 1 && (
              <div className="relative">
                <select
                  value={selectedGreetingIndex ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedGreetingIndex(val === '' ? undefined : Number(val));
                  }}
                  className="bg-background/50 border-border/50 focus:border-primary/50 w-full appearance-none rounded border px-2 py-1 pr-6 text-[11px] transition-colors"
                >
                  <option value="">Default greeting</option>
                  {greetingsList.slice(1).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Greeting {i + 2}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40" />
              </div>
            )}
            <button
              type="button"
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
              className="bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 w-full rounded px-2 py-1 text-[11px] font-medium transition-colors"
            >
              Save
            </button>
          </div>
          {presets.length === 0 ? (
            <p className="text-muted-foreground/60 py-4 text-center text-[11px]">No presets yet.</p>
          ) : (
            <div className="space-y-1">
              {presets.map((preset) => (
                <div key={preset.id} className="bg-background/50 flex items-center justify-between rounded px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground/80 text-[11px]">{preset.name}</span>
                    {preset.greetingIndex !== undefined && (
                      <span className="bg-primary/10 text-primary rounded px-1 py-0.5 text-[9px]">
                        {preset.greetingIndex === 0 ? 'Default' : `Greeting ${preset.greetingIndex + 1}`}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset.id)}
                      className="text-primary hover:bg-primary/10 touch-target rounded px-2 py-0.5 text-[10px] transition-colors"
                    >
                      Apply
                    </button>
                    {pendingDeleteId === preset.id ? (
                      <>
                        <button
                          type="button"
                          onClick={confirmDeletePreset}
                          className="text-destructive hover:bg-destructive/10 touch-target rounded px-2 py-0.5 text-[10px] font-medium transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={cancelDeletePreset}
                          className="text-muted-foreground hover:bg-muted/50 touch-target rounded px-2 py-0.5 text-[10px] transition-colors"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeletePreset(preset.id)}
                        className="text-destructive hover:bg-destructive/10 touch-target rounded px-2 py-0.5 text-[10px] transition-colors"
                      >
                        Del
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RegionCard({
  region,
  outfit,
  onSlotChange,
  onAddField,
  onRemoveField,
  onUpdateFieldLabel,
}: {
  region: BuiltInRegion;
  outfit: Record<string, string>;
  onSlotChange: (slot: string, value: string) => void;
  onAddField: () => void;
  onRemoveField: (fieldId: string) => void;
  onUpdateFieldLabel: (fieldId: string, label: string) => void;
}) {
  return (
    <div className={`rounded-lg border border-l-2 border-t-2 border-border/50 bg-card p-3 ${region.color}`}>
      <h3 className={`mb-2 text-[10px] font-semibold uppercase tracking-wider ${region.accent}`}>
        {region.label}
      </h3>
      <div className="space-y-2">
        {region.slots.map((slot) => (
          <div key={slot}>
            <label className="text-muted-foreground text-[10px] font-medium">
              {SLOT_LABELS[slot]}
            </label>
            <input
              type="text"
              value={outfit[slot] ?? ''}
              onChange={(e) => onSlotChange(slot, e.target.value)}
              placeholder={SLOT_PLACEHOLDERS[slot]}
              aria-label={SLOT_LABELS[slot]}
              className="bg-background/50 border-border/50 focus:border-primary/50 mt-0.5 w-full rounded border px-2 py-1 text-xs transition-colors placeholder:text-muted-foreground/40"
            />
          </div>
        ))}
        {region.customFields.map((field) => (
          <CustomFieldRow
            key={field.id}
            field={field}
            value={outfit[field.id] ?? ''}
            onChange={(v) => onSlotChange(field.id, v)}
            onRemove={() => onRemoveField(field.id)}
            onUpdateLabel={(l) => onUpdateFieldLabel(field.id, l)}
          />
        ))}
        <button
          type="button"
          onClick={onAddField}
          className="text-muted-foreground/50 hover:text-muted-foreground flex w-full items-center justify-center gap-1 rounded border border-dashed border-transparent py-1 text-[10px] transition-colors hover:border-border/40"
        >
          <Plus className="h-3 w-3" /> Add Field
        </button>
      </div>
    </div>
  );
}

function CustomPanelCard({
  panel,
  outfit,
  onSlotChange,
  onAddField,
  onRemoveField,
  onUpdateFieldLabel,
  onUpdateLabel,
  onRemove,
}: {
  panel: CustomPanel;
  outfit: Record<string, string>;
  onSlotChange: (slot: string, value: string) => void;
  onAddField: () => void;
  onRemoveField: (fieldId: string) => void;
  onUpdateFieldLabel: (fieldId: string, label: string) => void;
  onUpdateLabel: (label: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`rounded-lg border border-l-2 border-t-2 border-border/50 bg-card p-3 ${panel.color}`}>
      <div className="mb-2 flex items-center justify-between">
        <input
          type="text"
          value={panel.label}
          onChange={(e) => onUpdateLabel(e.target.value)}
          className={`bg-transparent text-[10px] font-semibold uppercase tracking-wider outline-none ${panel.accent}`}
        />
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground/40 hover:text-destructive touch-target -mr-1 rounded p-1 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-2">
        {panel.fields.map((field) => (
          <CustomFieldRow
            key={field.id}
            field={field}
            value={outfit[field.id] ?? ''}
            onChange={(v) => onSlotChange(field.id, v)}
            onRemove={() => onRemoveField(field.id)}
            onUpdateLabel={(l) => onUpdateFieldLabel(field.id, l)}
          />
        ))}
        <button
          type="button"
          onClick={onAddField}
          className="text-muted-foreground/50 hover:text-muted-foreground flex w-full items-center justify-center gap-1 rounded border border-dashed border-transparent py-1 text-[10px] transition-colors hover:border-border/40"
        >
          <Plus className="h-3 w-3" /> Add Field
        </button>
      </div>
    </div>
  );
}

function CustomFieldRow({
  field,
  value,
  onChange,
  onRemove,
  onUpdateLabel,
}: {
  field: CustomField;
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  onUpdateLabel: (label: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={field.label}
          onChange={(e) => onUpdateLabel(e.target.value)}
          className="bg-transparent text-muted-foreground text-[10px] font-medium outline-none"
        />
        <button
          type="button"
          onClick={onRemove}
          className="text-muted-foreground/30 hover:text-destructive touch-target -mr-1 ml-auto rounded p-1 transition-colors"
        >
          <Trash2 className="h-2.5 w-2.5" />
        </button>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        aria-label={field.label}
        className="bg-background/50 border-border/50 focus:border-primary/50 mt-0.5 w-full rounded border px-2 py-1 text-xs transition-colors placeholder:text-muted-foreground/40"
      />
    </div>
  );
}
