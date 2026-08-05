import { useState, useCallback, useEffect, useMemo } from 'react';
import { Shirt } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useChatStore } from '@/lib/stores';

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

const REGION_COLORS: Record<string, string> = {
  head: 'from-violet-500/20 to-violet-600/10 border-violet-500/30',
  upper: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
  mid: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
  lower: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
  feet: 'from-rose-500/20 to-rose-600/10 border-rose-500/30',
};

const REGION_ACCENT: Record<string, string> = {
  head: 'text-violet-400', upper: 'text-blue-400', mid: 'text-emerald-400',
  lower: 'text-amber-400', feet: 'text-rose-400',
};

const SLOT_REGIONS: Record<string, BodySlot[]> = {
  head: ['head', 'face'],
  upper: ['neck', 'undergarment_top', 'torso_top', 'torso_outer', 'arms', 'hands'],
  mid: ['accessories'],
  lower: ['undergarment_bottom', 'lower_body', 'legs'],
  feet: ['socks', 'feet'],
};

function emptyOutfit(): Record<BodySlot, string> {
  return Object.fromEntries(ALL_SLOTS.map((s) => [s, ''])) as Record<BodySlot, string>;
}

function formatOutfitForPrompt(items: Record<BodySlot, string>): string {
  const lines: string[] = [];
  for (const slot of ALL_SLOTS) {
    const desc = items[slot];
    if (desc.trim()) {
      lines.push(`- ${slot.replace(/_/g, ' ')}: ${desc}`);
    }
  }
  return lines.length > 0 ? lines.join('\n') : '(no outfit specified)';
}

function HumanSilhouette() {
  return (
    <svg viewBox="0 0 120 280" className="h-full w-auto" aria-hidden="true">
      <circle cx="60" cy="30" r="18" className="fill-muted/30 stroke-muted-foreground/20" strokeWidth="1" />
      <rect x="54" y="48" width="12" height="10" rx="2" className="fill-muted/25 stroke-muted-foreground/15" strokeWidth="0.5" />
      <path d="M35 58 L85 58 L80 140 L40 140 Z" className="fill-muted/20 stroke-muted-foreground/15" strokeWidth="0.5" />
      <path d="M35 58 L15 120 L22 122 L40 70" className="fill-muted/15 stroke-muted-foreground/10" strokeWidth="0.5" />
      <path d="M85 58 L105 120 L98 122 L80 70" className="fill-muted/15 stroke-muted-foreground/10" strokeWidth="0.5" />
      <circle cx="15" cy="125" r="6" className="fill-muted/20 stroke-muted-foreground/10" strokeWidth="0.5" />
      <circle cx="105" cy="125" r="6" className="fill-muted/20 stroke-muted-foreground/10" strokeWidth="0.5" />
      <path d="M40 140 L80 140 L85 160 L35 160 Z" className="fill-muted/20 stroke-muted-foreground/15" strokeWidth="0.5" />
      <path d="M38 160 L35 240 L50 240 L52 160" className="fill-muted/15 stroke-muted-foreground/10" strokeWidth="0.5" />
      <path d="M68 160 L70 240 L85 240 L82 160" className="fill-muted/15 stroke-muted-foreground/10" strokeWidth="0.5" />
      <ellipse cx="42" cy="250" rx="12" ry="6" className="fill-muted/20 stroke-muted-foreground/10" strokeWidth="0.5" />
      <ellipse cx="78" cy="250" rx="12" ry="6" className="fill-muted/20 stroke-muted-foreground/10" strokeWidth="0.5" />
    </svg>
  );
}

interface OutfitPreset {
  id: string;
  name: string;
  items: Record<BodySlot, string>;
  createdAt: number;
}

export function OutfitPanel() {
  const characterId = useChatStore((s) => s.activeCharacterId);
  const [outfit, setOutfit] = useState<Record<BodySlot, string>>(emptyOutfit);
  const [presets, setPresets] = useState<OutfitPreset[]>([]);
  const [presetName, setPresetName] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (characterId === null) return;
    const key = `worldcore/outfit/${characterId}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        setOutfit(data.items ?? emptyOutfit());
        setPresets(data.presets ?? []);
      } else {
        setOutfit(emptyOutfit());
        setPresets([]);
      }
    } catch {
      setOutfit(emptyOutfit());
      setPresets([]);
    }
  }, [characterId]);

  const saveToStorage = useCallback((items: Record<BodySlot, string>, prs: OutfitPreset[]) => {
    if (characterId === null) return;
    const key = `worldcore/outfit/${characterId}`;
    localStorage.setItem(key, JSON.stringify({ items, presets: prs }));
  }, [characterId]);

  const handleSlotChange = useCallback((slot: BodySlot, value: string) => {
    const next = { ...outfit, [slot]: value };
    setOutfit(next);
    saveToStorage(next, presets);
  }, [outfit, presets, saveToStorage]);

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const preset: OutfitPreset = {
      id: `preset-${Date.now()}`,
      name: presetName.trim(),
      items: { ...outfit },
      createdAt: Date.now(),
    };
    const next = [...presets, preset];
    setPresets(next);
    setPresetName('');
    saveToStorage(outfit, next);
  }, [presetName, outfit, presets, saveToStorage]);

  const handleApplyPreset = useCallback((presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      setOutfit(preset.items);
      saveToStorage(preset.items, presets);
    }
  }, [presets, saveToStorage]);

  const handleDeletePreset = useCallback((presetId: string) => {
    const next = presets.filter((p) => p.id !== presetId);
    setPresets(next);
    saveToStorage(outfit, next);
  }, [presets, outfit, saveToStorage]);

  const promptPreview = useMemo(() => formatOutfitForPrompt(outfit), [outfit]);

  if (characterId === null) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">Select a character to manage their outfit.</p>
      </div>
    );
  }

  const regions = Object.entries(SLOT_REGIONS);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-semibold">Outfit Manager</h2>
        <button
          type="button"
          onClick={() => setShowPrompt(!showPrompt)}
          className="text-muted-foreground hover:text-foreground rounded px-2 py-1 text-xs transition-colors"
        >
          {showPrompt ? 'Hide' : 'Show'} Prompt
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-start justify-center gap-6">
          <div className="flex flex-col gap-3 pt-8">
            {regions.map(([region, slots]) => (
              <div key={`left-${region}`} className={`rounded-lg border bg-gradient-to-br p-2 ${REGION_COLORS[region]}`}>
                <div className="space-y-1.5">
                  {slots.slice(0, Math.ceil(slots.length / 2)).map((slot) => (
                    <div key={slot}>
                      <label className={`text-[10px] font-medium uppercase tracking-wider ${REGION_ACCENT[region]}`}>
                        {SLOT_LABELS[slot]}
                      </label>
                      <input
                        type="text"
                        value={outfit[slot]}
                        onChange={(e) => handleSlotChange(slot, e.target.value)}
                        placeholder={SLOT_PLACEHOLDERS[slot]}
                        className="bg-background/50 border-border/50 focus:border-primary/50 mt-0.5 w-full rounded border px-2 py-1 text-xs transition-colors placeholder:text-muted-foreground/40"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex h-[280px] shrink-0 items-center justify-center">
            <HumanSilhouette />
          </div>

          <div className="flex flex-col gap-3 pt-8">
            {regions.map(([region, slots]) => (
              <div key={`right-${region}`} className={`rounded-lg border bg-gradient-to-br p-2 ${REGION_COLORS[region]}`}>
                <div className="space-y-1.5">
                  {slots.slice(Math.ceil(slots.length / 2)).map((slot) => (
                    <div key={slot}>
                      <label className={`text-[10px] font-medium uppercase tracking-wider ${REGION_ACCENT[region]}`}>
                        {SLOT_LABELS[slot]}
                      </label>
                      <input
                        type="text"
                        value={outfit[slot]}
                        onChange={(e) => handleSlotChange(slot, e.target.value)}
                        placeholder={SLOT_PLACEHOLDERS[slot]}
                        className="bg-background/50 border-border/50 focus:border-primary/50 mt-0.5 w-full rounded border px-2 py-1 text-xs transition-colors placeholder:text-muted-foreground/40"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {showPrompt && (
          <div className="mt-4 rounded-lg border border-border/50 bg-muted/20 p-3">
            <h3 className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wider">
              Prompt Context
            </h3>
            <pre className="text-foreground/80 max-h-32 overflow-y-auto whitespace-pre-wrap text-xs">
              {promptPreview}
            </pre>
          </div>
        )}

        <div className="mt-4 border-t pt-4">
          <h3 className="text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-wider">
            Presets
          </h3>
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="New preset name..."
              className="bg-background/50 border-border/50 focus:border-primary/50 flex-1 rounded border px-2 py-1 text-xs transition-colors placeholder:text-muted-foreground/40"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSavePreset(); }}
            />
            <button
              type="button"
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
              className="bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 rounded px-3 py-1 text-xs font-medium transition-colors"
            >
              Save
            </button>
          </div>
          {presets.length === 0 ? (
            <p className="text-muted-foreground/60 py-2 text-center text-xs">No presets saved yet.</p>
          ) : (
            <div className="space-y-1">
              {presets.map((preset) => (
                <div key={preset.id} className="bg-background/50 flex items-center justify-between rounded px-2 py-1.5">
                  <span className="text-foreground/80 text-xs">{preset.name}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset.id)}
                      className="text-primary hover:bg-primary/10 rounded px-2 py-0.5 text-[10px] transition-colors"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePreset(preset.id)}
                      className="text-destructive hover:bg-destructive/10 rounded px-2 py-0.5 text-[10px] transition-colors"
                    >
                      Delete
                    </button>
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
