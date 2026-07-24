import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, Camera, X, Star, Trash2, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Persona } from '@/shared/types/persona';
import { PersonaFormContext, usePersonaForm } from './PersonaFormContext';
import type { PersonaEditorState } from './usePersonaEditor';

interface PersonaFormProps {
  persona: Persona;
  editor: PersonaEditorState;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PersonaForm({ persona, editor }: PersonaFormProps) {
  const ctxValue = { ...editor, persona };

  return (
    <PersonaFormContext.Provider value={ctxValue}>
      <div className="contents">
        <PersonaFormFields />
        <PersonaSidebar />
      </div>
    </PersonaFormContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Left column — form fields                                          */
/* ------------------------------------------------------------------ */

function PersonaFormFields() {
  const form = usePersonaForm();
  const {
    name,
    setName,
    description,
    setDescription,
    personality,
    setPersonality,
    scenario,
    setScenario,
    systemPrompt,
    setSystemPrompt,
  } = form;

  return (
    <div className="min-w-0 flex-1 space-y-5">
      {/* Name */}
      <div className="max-w-sm space-y-1.5">
        <Label className="text-sm font-medium">Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Persona name"
          className="h-9"
        />
      </div>

      {/* Description */}
      <div className="max-w-2xl space-y-1.5">
        <Label className="text-sm font-medium">Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Who is this persona? Physical appearance, background, etc."
          rows={1}
          className="resize-y"
        />
        <p className="text-muted-foreground text-xs">
          Used in prompt context via {'{{persona}}'} macro.
        </p>
      </div>

      {/* Personality + Scenario row */}
      <div className="grid max-w-2xl grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Personality</Label>
          <Textarea
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            placeholder="Traits, mannerisms..."
            rows={1}
            className="resize-y"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Scenario</Label>
          <Textarea
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="Current situation or context."
            rows={1}
            className="resize-y"
          />
        </div>
      </div>

      {/* System Prompt */}
      <div className="max-w-2xl space-y-1.5">
        <Label className="text-sm font-medium">System Prompt</Label>
        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Special instructions for the LLM when using this persona."
          rows={1}
          className="resize-y"
        />
        <p className="text-muted-foreground text-xs">
          Injected into the prompt when this persona is active.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Right column — sidebar                                            */
/* ------------------------------------------------------------------ */

function PersonaSidebar() {
  const form = usePersonaForm();
  const {
    persona,
    name,
    avatarPreview,
    dragOver,
    fileInputRef,
    handleAvatarChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveAvatar,
    setDefault,
    isSettingDefault,
    remove,
    isRemoving,
  } = form;

  const previewInitial = name && name.length > 0 ? name[0]!.toUpperCase() : '?';

  return (
    <div className="w-72 shrink-0 space-y-4">
      {/* Avatar upload */}
      <div className="flex flex-col items-center gap-2">
        <div
          role="button"
          tabIndex={0}
          className={cn(
            'relative h-24 w-24 cursor-pointer overflow-hidden rounded-full border-2 border-dashed transition-all duration-200',
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
          {avatarPreview ? (
            <img src={avatarPreview} alt="Persona avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-1">
              <Upload className="h-5 w-5" />
              <span className="text-[10px]">Drop photo</span>
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
        {avatarPreview && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            <X className="inline h-3 w-3" /> Remove
          </button>
        )}
      </div>

      {/* Default toggle */}
      <div className="border-border/60 border-t pt-3">
        {persona.isDefault ? (
          <div className="border-ember/40 bg-ember/10 flex items-center justify-center gap-1.5 rounded-md border px-3 py-2">
            <Star className="text-ember h-3.5 w-3.5" fill="currentColor" />
            <span className="text-ember text-sm font-medium">Default Persona</span>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={setDefault}
            disabled={isSettingDefault}
            className="w-full"
          >
            <Star className="mr-1.5 h-3.5 w-3.5" />
            Set as Default
          </Button>
        )}
      </div>

      {/* Timestamps */}
      <div className="border-border/60 space-y-1.5 border-t pt-3">
        <div className="flex items-center gap-2 text-xs">
          <Calendar className="text-muted-foreground/50 h-3 w-3" />
          <span className="text-muted-foreground">Created</span>
          <span className="mono-tag text-muted-foreground/70 tabular-nums">
            {formatDate(persona.dateAdded)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Clock className="text-muted-foreground/50 h-3 w-3" />
          <span className="text-muted-foreground">Modified</span>
          <span className="mono-tag text-muted-foreground/70 tabular-nums">
            {formatDate(persona.dateModified)}
          </span>
        </div>
      </div>

      {/* Delete */}
      <div className="border-border/60 border-t pt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={remove}
          disabled={isRemoving || persona.isDefault}
          className="text-destructive hover:bg-destructive/5 border-destructive/30 hover:border-destructive/50 w-full"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          {isRemoving ? 'Deleting...' : 'Delete Persona'}
        </Button>
        {persona.isDefault && (
          <p className="text-muted-foreground/60 mt-1 text-center text-[11px]">
            Cannot delete the default persona
          </p>
        )}
      </div>

      {/* Live preview */}
      <div className="border-border/60 border-t pt-3">
        <p className="text-muted-foreground/60 mb-2 text-[10px] font-semibold tracking-wider uppercase">
          Preview
        </p>
        <div className="flex flex-col gap-0.5">
          {/* Name row */}
          <div className="flex items-center gap-1.5">
            <div className="border-ember/40 bg-ember/10 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border">
              {avatarPreview ? (
                <img src={avatarPreview} alt={name} className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span className="display-host text-ember text-[11px] font-semibold">
                  {previewInitial}
                </span>
              )}
            </div>
            <span className="display-host text-ember/90 truncate text-[13px] font-medium">
              {name || 'Persona'}
            </span>
          </div>
          {/* Metadata row */}
          <div className="flex items-center gap-2 pl-[30px]">
            <span className="mono-tag text-muted-foreground/50 tabular-nums">--:--</span>
            <span className="mono-tag text-muted-foreground/50 tabular-nums">001</span>
            <span className="mono-tag text-ember/40">YOU</span>
          </div>
          {/* Message bubble */}
          <div className="mes_text bg-ember/5 relative mt-1 rounded-md px-4 py-3 text-[13.5px] leading-relaxed break-words shadow-sm">
            This is how my messages will appear.
          </div>
        </div>
      </div>
    </div>
  );
}
