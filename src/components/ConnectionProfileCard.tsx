import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Cable, Globe, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConnectionProfile } from "@/shared/schemas/connection-profile";

interface ConnectionProfileCardProps {
  profile: ConnectionProfile;
  index?: number;
  isSelected?: boolean;
  onEdit: (profile: ConnectionProfile) => void;
  onDelete: (profile: ConnectionProfile) => void;
  onSelect: (profile: ConnectionProfile) => void;
}

const API_BADGE_LABELS: Record<string, string> = {
  openai: "OpenAI",
  openrouter: "OpenRouter",
  custom: "Custom",
  cohere: "Cohere",
  ai21: "AI21",
  xai: "xAI",
  azure_openai: "Azure OpenAI",
  groq: "Groq",
  koboldcpp: "KoboldCpp",
  openai_legacy: "OpenAI Legacy",
  makersuite: "MakerSuite",
  vertexai: "Vertex AI",
  mistralai: "Mistral AI",
  deepseek: "DeepSeek",
  aimlapi: "AIML API",
  fireworks: "Fireworks",
  claude: "Claude",
  chutes: "Chutes",
  electronhub: "ElectronHub",
  nanogpt: "NanoGPT",
  cometapi: "CometAPI",
  moonshot: "Moonshot",
  zai: "Z-AI",
  siliconflow: "SiliconFlow",
  minimax: "MiniMax",
  ollama: "Ollama",
  kobold: "Kobold",
  textgenerationwebui: "Text Gen WebUI",
  ooba: "Oobabooga",
  aphrodite: "Aphrodite",
  llamacpp: "llama.cpp",
  tabby: "Tabby",
  mancer: "Mancer",
  vllm: "vLLM",
  featherless: "Featherless",
  huggingface: "HuggingFace",
  dreamgen: "DreamGen",
  togetherai: "Together AI",
  infermaticai: "InfermaticAI",
  generic: "Generic",
};

const CHAT_SOURCES = new Set([
  "openai", "openrouter", "custom", "cohere", "ai21", "xai",
  "azure_openai", "groq", "koboldcpp", "openai_legacy", "makersuite",
  "vertexai", "mistralai", "deepseek", "aimlapi", "fireworks",
  "claude", "chutes", "electronhub", "nanogpt", "cometapi",
  "moonshot", "zai", "siliconflow", "minimax", "ollama",
]);

function isChatSource(api: string): boolean {
  return CHAT_SOURCES.has(api);
}

export function ConnectionProfileCard({
  profile,
  index = 0,
  isSelected = false,
  onEdit,
  onDelete,
  onSelect,
}: ConnectionProfileCardProps) {
  const apiBadge = API_BADGE_LABELS[profile.api] ?? profile.api;
  const apiType = isChatSource(profile.api) ? "Chat Completions" : "Text Completions";

  return (
    <article
      className={cn(
        "group relative rounded-sm cursor-pointer p-0 overflow-hidden",
        "bg-card border shadow-sm",
        "transition-all duration-200",
        isSelected
          ? "border-ember/60 shadow-[0_0_20px_-6px_color-mix(in_oklch,var(--ember)_50%,transparent)]"
          : "border-border hover:border-ember/30",
        "hover:-translate-y-1 hover:shadow-[0_14px_36px_-12px_color-mix(in_oklch,var(--ember)_55%,transparent)]",
      )}
      onClick={() => onSelect(profile)}
    >
      {/* Top number rail */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-background/30">
        <span className="mono-tag text-muted-foreground/55 tabular-nums">
          {`#${String(index + 1).padStart(3, "0")}`}
        </span>
        <span className="mono-tag text-muted-foreground/35 tabular-nums truncate max-w-[120px]">
          {profile.id}
        </span>
      </div>

      {/* Profile name + API badge */}
      <div className="px-4 md:px-5 pt-4 pb-3 flex items-start gap-3 relative">
        <div className="relative shrink-0">
          <div className="h-14 w-14 rounded-full overflow-hidden border border-border bg-muted/50 flex items-center justify-center">
            {isChatSource(profile.api) ? (
              <Cable className="h-6 w-6 text-ember/70" />
            ) : (
              <Server className="h-6 w-6 text-ember/70" />
            )}
          </div>
          {isSelected && (
            <span
              aria-hidden
              className="absolute -inset-[3px] rounded-full border-2 border-ember/80"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="display-host text-[20px] leading-tight tracking-tight truncate">
            {profile.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="mono-tag px-1.5 py-0.5 rounded-sm bg-ember/10 border border-ember/20 text-ember text-[11px]">
              {apiBadge}
            </span>
            <span className="mono-tag text-muted-foreground/45">
              {apiType}
            </span>
          </div>
        </div>
      </div>

      {/* Model */}
      <div className="px-4 md:px-5 pb-3">
        <p className="text-[13px] leading-relaxed text-foreground/65">
          {profile.model ? (
            <>
              <span className="mono-tag text-muted-foreground/45 mr-1">model:</span>
              {profile.model}
            </>
          ) : (
            <span className="text-muted-foreground/40 italic">no model set</span>
          )}
        </p>
      </div>

      {/* API URL */}
      {profile.apiUrl && (
        <div className="px-4 md:px-5 pb-2">
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground/55">
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate mono-tag">{profile.apiUrl}</span>
          </div>
        </div>
      )}

      {/* Preset */}
      {profile.preset && (
        <div className="px-4 md:px-5 pb-3">
          <span className="mono-tag px-1.5 py-0.5 rounded-sm bg-muted/50 border border-border/60 text-foreground/65">
            preset: {profile.preset}
          </span>
        </div>
      )}

      {/* Timestamps */}
      {(profile.createdAt || profile.updatedAt) && (
        <div className="px-4 pb-3 flex items-center gap-3">
          {profile.createdAt && (
            <span className="mono-tag text-[10px] text-muted-foreground/35">
              created {new Date(profile.createdAt).toLocaleDateString()}
            </span>
          )}
          {profile.updatedAt && (
            <span className="mono-tag text-[10px] text-muted-foreground/35">
              updated {new Date(profile.updatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}

      {/* Action rail */}
      <div className="border-t border-border/60 flex items-stretch divide-x divide-border/60">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(profile);
          }}
          className="flex-1 justify-center h-9 rounded-none border-0 font-medium hover:bg-accent/40 hover:text-ember"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span className="mono-tag">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(profile);
          }}
          className="flex-1 justify-center h-9 rounded-none border-0 font-medium hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="mono-tag">Slag</span>
        </Button>
      </div>
    </article>
  );
}
