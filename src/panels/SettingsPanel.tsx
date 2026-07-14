import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, RotateCcw, Check } from "lucide-react";
import { cn, surfaceCard } from "@/lib/utils";
import { InlineSection } from "@/components/drawers/InlineSection";
import type { SettingsObject } from "@/shared/types/settings";

interface SettingsForm {
  model: string;
  temperature: string;
  max_tokens: string;
  top_p: string;
  top_k: string;
  repetition_penalty: string;
  presence_penalty: string;
  frequency_penalty: string;
  stream: string;
  [key: string]: string;
}

const defaultForm: SettingsForm = {
  model: "",
  temperature: "0.7",
  max_tokens: "4096",
  top_p: "1",
  top_k: "50",
  repetition_penalty: "1.1",
  presence_penalty: "0",
  frequency_penalty: "0",
  stream: "true",
};

const fields: { key: keyof SettingsForm; label: string; type?: string; caption: string }[] = [
  { key: "model",              label: "Model",              caption: "model id · e.g. gpt-4o-mini" },
  { key: "temperature",        label: "Temperature",        type: "number", caption: "creativity knob (0-2)" },
  { key: "max_tokens",         label: "Max Tokens",          type: "number", caption: "response upper bound" },
  { key: "top_p",              label: "Top P",               type: "number", caption: "nucleus sampling cutoff" },
  { key: "top_k",              label: "Top K",               type: "number", caption: "top-k sampling pool" },
  { key: "repetition_penalty", label: "Repetition Penalty",  type: "number", caption: "nudge repetition" },
  { key: "presence_penalty",   label: "Presence Penalty",    type: "number", caption: "encourage new tokens" },
  { key: "frequency_penalty",  label: "Frequency Penalty",   type: "number", caption: "decay frequent tokens" },
  { key: "stream",             label: "Stream",             caption: "true or false" },
];

export function SettingsPanel() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading, error } = useQuery<SettingsObject>({
    queryKey: ["/api/v1/settings/get"],
    queryFn: async () => {
      const res = await fetch("/api/v1/settings/get");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.results ?? data.data ?? data);
    },
  });

  const [form, setForm] = useState<SettingsForm>(defaultForm);

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/v1/settings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      const result = await res.json();
      return Array.isArray(result) ? result : (result.results ?? result.data ?? result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/settings/get"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = () => {
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const val = form[f.key] ?? "";
      if (f.type === "number") {
        payload[f.key] = parseFloat(val) || 0;
      } else if (f.key === "stream") {
        payload[f.key] = val === "true";
      } else {
        payload[f.key] = val;
      }
    }
    saveMutation.mutate(payload);
  };

  const handleReset = () => {
    setForm({ ...defaultForm });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 flex-col gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-ember" />
        <span className="mono-tag text-muted-foreground/55">
          tempering parameters
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          surfaceCard,
          "flex items-center justify-center h-64",
        )}
      >
        <span className="mono-tag text-destructive">{error.message}</span>
      </div>
    );
  }

  return (
    <div data-panel="settings" className="flex flex-col gap-3 h-full">
      {/* Section header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="mono-tag text-ember">{`[04] — TONGS`}</span>
            <span className="h-px w-10 bg-ember/40" />
          </div>
          <h2
            className="display-host text-[42px] leading-none tracking-tight"
          >
            Forge Parameters
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Generation dials that shape responses. Sliders,
            penalties, and stop points for the LLM backend.
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
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="h-9 ember-pulse"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span className="mono-tag font-bold">
              {saveMutation.isPending ? "TEMPERING..." : "QUENCH"}
            </span>
          </Button>
        </div>
      </header>

      {/* Parameters grid */}
      <InlineSection
        panelId="settings"
        sectionId="generation"
        title="Generation"
        defaultOpen
      >
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
            {fields.map((f, idx) => (
              <div key={f.key} className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <Label className="text-[13px] font-medium">
                    <span className="mono-tag text-muted-foreground/45 mr-2">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    {f.label}
                  </Label>
                  <span className="mono-tag text-muted-foreground/45">
                    {f.type === "number" ? "float" : "string"}
                  </span>
                </div>
                <Input
                  type={f.type ?? "text"}
                  step={f.type === "number" ? "0.01" : undefined}
                  value={form[f.key] ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, [f.key]: e.target.value })
                  }
                  className="font-mono text-[13px]"
                />
                <span className="mono-tag text-muted-foreground/50">
                  {f.caption}
                </span>
              </div>
            ))}
          </div>
      </InlineSection>

      {/* Raw settings manifest */}
      <InlineSection
        panelId="settings"
        sectionId="raw"
        title="Raw Manifest"
      >
          {settings ? (
            <pre
              className="text-[11.5px] leading-snug font-mono p-3 m-0 max-h-72 overflow-auto dot-grid rounded-sm"
              style={{
                background:
                  "color-mix(in oklch, var(--background) 80%, transparent)",
              }}
            >
              {JSON.stringify(settings, null, 2)}
            </pre>
          ) : (
            <div className="py-3 text-[12px] text-muted-foreground/55 italic">
              no settings manifest present
            </div>
          )}
      </InlineSection>
    </div>
  );
}
