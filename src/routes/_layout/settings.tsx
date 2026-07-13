import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, RotateCcw, Check } from "lucide-react";
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

const fields: { key: keyof SettingsForm; label: string; type?: string }[] = [
  { key: "model", label: "Model" },
  { key: "temperature", label: "Temperature", type: "number" },
  { key: "max_tokens", label: "Max Tokens", type: "number" },
  { key: "top_p", label: "Top P", type: "number" },
  { key: "top_k", label: "Top K", type: "number" },
  { key: "repetition_penalty", label: "Repetition Penalty", type: "number" },
  { key: "presence_penalty", label: "Presence Penalty", type: "number" },
  { key: "frequency_penalty", label: "Frequency Penalty", type: "number" },
  { key: "stream", label: "Stream" },
];

export function Component() {
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Error: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Application configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generation Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label>{f.label}</Label>
                <Input
                  type={f.type ?? "text"}
                  step={f.type === "number" ? "0.01" : undefined}
                  value={form[f.key] ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, [f.key]: e.target.value })
                  }
                />
              </div>
            ))}
          </div>

          {settings && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                Raw Settings
              </h4>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-48">
                {JSON.stringify(settings, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-green-600">
            <Check className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>
    </div>
  );
}
