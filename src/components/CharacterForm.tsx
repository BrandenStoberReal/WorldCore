import { useState, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";
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

export function CharacterForm({ character, onSubmit, onCancel, isSubmitting }: CharacterFormProps) {
  const isEdit = !!character;
  const [name, setName] = useState(character?.name ?? "");
  const [description, setDescription] = useState(character?.description ?? "");
  const [personality, setPersonality] = useState(character?.personality ?? "");
  const [scenario, setScenario] = useState(character?.scenario ?? "");
  const [firstMes, setFirstMes] = useState(character?.first_mes ?? "");
  const [mesExample, setMesExample] = useState(character?.mes_example ?? "");
  const [creatorNotes, setCreatorNotes] = useState(character?.creator_notes ?? "");
  const [systemPrompt, setSystemPrompt] = useState(character?.system_prompt ?? "");
  const [postHistoryInstructions, setPostHistoryInstructions] = useState(character?.post_history_instructions ?? "");
  const [tagsInput, setTagsInput] = useState(character?.tags?.join(", ") ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    character ? `/api/v1/characters/avatar?id=${character.id}` : null
  );
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>(undefined);

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setAvatarPreview(result);
      setAvatarDataUrl(result);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleClearAvatar = useCallback(() => {
    setAvatarPreview(character ? `/api/v1/characters/avatar?id=${character!.id}` : null);
    setAvatarDataUrl(undefined);
  }, [character]);

  const handleSubmit = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const data: CharacterCreateInput & { avatar?: string } = {
        name,
        description,
        personality,
        scenario,
        first_mes: firstMes,
        mes_example: mesExample,
        creator_notes: creatorNotes,
        system_prompt: systemPrompt,
        post_history_instructions: postHistoryInstructions,
        tags,
        creator: character?.creator ?? "",
        character_version: character?.character_version ?? "",
        alternate_greetings: character?.alternate_greetings ?? [],
      };

      if (avatarDataUrl) {
        data.avatar = avatarDataUrl;
      }

      onSubmit(data);
    },
    [
      name, description, personality, scenario, firstMes, mesExample,
      creatorNotes, systemPrompt, postHistoryInstructions, tagsInput,
      avatarDataUrl, character, onSubmit,
    ]
  );

  const canSubmit = name.trim().length > 0 && firstMes.trim().length > 0 && !isSubmitting;

  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      {/* Avatar Upload */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-28 w-28 overflow-hidden rounded-full bg-muted">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Avatar preview"
              className="h-28 w-28 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center text-muted-foreground">
              <Camera className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              asChild
            >
              <span>
                <Camera className="h-4 w-4" />
                Upload
              </span>
            </Button>
            <Input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </label>
          {avatarPreview && avatarDataUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearAvatar}
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <Label>
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Character name"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Character description"
          rows={3}
        />
      </div>

      {/* Personality */}
      <div className="space-y-2">
        <Label>Personality</Label>
        <Textarea
          value={personality}
          onChange={(e) => setPersonality(e.target.value)}
          placeholder="Character personality"
          rows={3}
        />
      </div>

      {/* Scenario */}
      <div className="space-y-2">
        <Label>Scenario</Label>
        <Textarea
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          placeholder="Scenario"
          rows={2}
        />
      </div>

      {/* First Message */}
      <div className="space-y-2">
        <Label>
          First Message <span className="text-destructive">*</span>
        </Label>
        <Textarea
          value={firstMes}
          onChange={(e) => setFirstMes(e.target.value)}
          placeholder="Opening greeting"
          rows={3}
        />
      </div>

      {/* Example Dialogues */}
      <div className="space-y-2">
        <Label>Example Dialogues</Label>
        <Textarea
          value={mesExample}
          onChange={(e) => setMesExample(e.target.value)}
          placeholder='e.g. &lt;start&gt;\n{{user}}: Hello\n{{char}}: Hi there!'
          rows={4}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>Tags</Label>
        <Input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="comma, separated, tags"
        />
      </div>

      {/* Advanced fields */}
      <div className="space-y-2">
        <Label>Creator Notes</Label>
        <Textarea
          value={creatorNotes}
          onChange={(e) => setCreatorNotes(e.target.value)}
          placeholder="Notes for the AI"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>System Prompt</Label>
        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="System prompt"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Post-History Instructions</Label>
        <Textarea
          value={postHistoryInstructions}
          onChange={(e) => setPostHistoryInstructions(e.target.value)}
          placeholder="Instructions appended after history"
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
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
