import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Key, Plug, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { OnlineStatus } from "./OnlineStatus";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface KoboldHordeFormProps {
  onConnect?: (config: Record<string, unknown>) => void;
  connected?: boolean;
}

interface HordeModel {
  id: string;
  name: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HORDE_LINKS = [
  {
    href: "https://aihorde.net/",
    label: "AI Horde Website",
    external: true,
  },
  {
    href: "https://docs.sillytavern.app/usage/api-connections/horde/",
    label: "Review the Privacy statement",
    external: true,
  },
  {
    href: "https://aihorde.net/register",
    label: "Register a Horde account for faster queue times",
    external: true,
  },
  {
    href: "https://github.com/Haidra-Org/horde-worker-reGen",
    label: "Learn how to contribute your idle GPU cycles to the Horde",
    external: true,
  },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KoboldHordeForm({
  onConnect,
  connected = false,
}: KoboldHordeFormProps) {
  const [apiKey, setApiKey] = useState("");
  const [adjustedContext, setAdjustedContext] = useState(true);
  const [adjustedResponse, setAdjustedResponse] = useState(true);
  const [trustedOnly, setTrustedOnly] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<HordeModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // ------ Model fetching ------

  const fetchModels = useCallback(async () => {
    setLoadingModels(true);
    setModelError(null);
    try {
      const data = (await apiFetch("/models/koboldhorde")) as unknown;
      const models = normalizeHordeModels(data);
      setAvailableModels(models);
    } catch (err) {
      setModelError(
        err instanceof Error ? err.message : "Failed to load Horde models",
      );
      setAvailableModels([]);
    } finally {
      setLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    void fetchModels();
  }, [fetchModels]);

  // ------ Model multi-select ------

  const toggleModel = useCallback((modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId],
    );
  }, []);

  // ------ Connect ------

  const handleConnect = useCallback(() => {
    setConnecting(true);
    onConnect?.({
      type: "koboldhorde",
      apiKey: apiKey || "0000000000",
      adjustContext: adjustedContext,
      adjustResponse: adjustedResponse,
      trustedWorkers: trustedOnly,
      models: selectedModels,
    });
  }, [
    apiKey,
    adjustedContext,
    adjustedResponse,
    trustedOnly,
    selectedModels,
    onConnect,
  ]);

  return (
    <div className="space-y-5">
      {/* Informational links */}
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {HORDE_LINKS.map((link) => (
          <li key={link.href} className="flex items-start gap-1.5">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/40 shrink-0" />
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              {link.label}
              {link.external && (
                <ExternalLink className="h-3 w-3 shrink-0" />
              )}
            </a>
          </li>
        ))}
      </ul>

      {/* Privacy notice */}
      <p className="text-sm text-muted-foreground/80">
        Avoid sending sensitive information to the Horde.
      </p>

      {/* Checkboxes */}
      <div className="space-y-2.5 rounded-md border border-border/60 bg-muted/20 px-3 py-3">
        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={adjustedContext}
            onChange={(e) => setAdjustedContext(e.target.checked)}
            className="size-4 shrink-0 rounded border-border accent-primary"
          />
          <span className="text-foreground/80">
            Adjust context size to worker capabilities
          </span>
        </label>
        <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={adjustedResponse}
            onChange={(e) => setAdjustedResponse(e.target.checked)}
            className="size-4 shrink-0 rounded border-border accent-primary"
          />
          <span className="text-foreground/80">
            Adjust response length to worker capabilities
          </span>
        </label>
        <label
          className="flex items-center gap-2.5 text-sm cursor-pointer select-none"
          title="Can help with bad responses..."
        >
          <input
            type="checkbox"
            checked={trustedOnly}
            onChange={(e) => setTrustedOnly(e.target.checked)}
            className="size-4 shrink-0 rounded border-border accent-primary"
          />
          <span className="text-foreground/80">Trusted workers only</span>
        </label>
      </div>

      {/* API Key */}
      <div className="space-y-2">
        <Label>API Key</Label>
        <p className="text-xs text-muted-foreground">
          Get it here:{" "}
          <a
            href="https://aihorde.net/register"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Register
          </a>{" "}
          · Enter{" "}
          <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
            0000000000
          </code>{" "}
          for anonymous mode.
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter Horde API key"
            className="flex-1"
            autoComplete="off"
          />
          <Button
            type="button"
            variant="default"
            size="icon"
            onClick={handleConnect}
            title="Save and connect"
            aria-label="Save and connect"
          >
            <Plug className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Manage API keys"
            aria-label="Manage API keys"
          >
            <Key className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground/70 italic">
          For privacy reasons, your API key will be hidden after you click
          &quot;Connect&quot;.
        </p>
      </div>

      {/* Model multi-select */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Models</Label>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => void fetchModels()}
            disabled={loadingModels}
            title="Refresh models"
            aria-label="Refresh models"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                loadingModels && "animate-spin",
              )}
            />
          </Button>
        </div>

        {modelError && (
          <p className="text-xs text-destructive">{modelError}</p>
        )}

        <div className="max-h-48 overflow-y-auto rounded-md border border-border/60 bg-muted/10">
          {loadingModels && availableModels.length === 0 && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              Loading models...
            </div>
          )}

          {!loadingModels && availableModels.length === 0 && !modelError && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No models available
            </p>
          )}

          {availableModels.map((model) => (
            <label
              key={model.id}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-sm border-b border-border/30 last:border-b-0 cursor-pointer select-none transition-colors",
                selectedModels.includes(model.id)
                  ? "bg-primary/5"
                  : "hover:bg-accent/30",
              )}
            >
              <input
                type="checkbox"
                checked={selectedModels.includes(model.id)}
                onChange={() => toggleModel(model.id)}
                className="size-3.5 shrink-0 rounded border-border accent-primary"
              />
              <span className="flex-1 truncate text-foreground/80">
                {model.name || model.id}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {model.count} worker{model.count !== 1 ? "s" : ""}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Connect / Cancel */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={handleConnect}
          disabled={connecting}
          className={cn(
            "gap-1.5",
            connected &&
              "bg-emerald-600 hover:bg-emerald-600/90 text-white",
          )}
        >
          <Plug className="h-4 w-4" />
          {connected ? "Connected" : "Connect"}
        </Button>
        {connecting && (
          <Button type="button" variant="outline" className="gap-1.5">
            Cancel
          </Button>
        )}
      </div>

      {/* Status */}
      <OnlineStatus connected={connected} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeHordeModels(data: unknown): HordeModel[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((entry) => {
      if (entry && typeof entry === "object") {
        const rec = entry as Record<string, unknown>;
        const id =
          (typeof rec.id === "string" && rec.id) ||
          (typeof rec.model === "string" && rec.model) ||
          (typeof rec.name === "string" && rec.name) ||
          "";
        if (!id) return null;
        const name =
          (typeof rec.name === "string" && rec.name) ||
          (typeof rec.label === "string" && rec.label) ||
          id;
        const count =
          typeof rec.count === "number" ? rec.count : 0;
        return { id, name, count };
      }
      return null;
    })
    .filter((m): m is HordeModel => m !== null);
}
