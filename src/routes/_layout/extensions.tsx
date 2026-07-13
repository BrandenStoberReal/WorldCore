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
import { Modal } from "@/components/Modal";
import {
  Loader2,
  Download,
  RefreshCw,
  Plus,
  Package,
  User,
  Calendar,
  GitBranch,
} from "lucide-react";
import type { ExtensionInfo } from "@/shared/types/extensions";

export function Component() {
  const queryClient = useQueryClient();
  const [installOpen, setInstallOpen] = useState(false);
  const [installUrl, setInstallUrl] = useState("");

  const { data: extensions, isLoading, error } = useQuery<ExtensionInfo[]>({
    queryKey: ["/api/v1/extensions/list"],
    queryFn: async () => {
      const res = await fetch("/api/v1/extensions/list");
      if (!res.ok) throw new Error("Failed to fetch extensions");
      const data = await res.json();
      return Array.isArray(data) ? data : (data.results ?? data.data ?? data);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      name,
      enable,
    }: {
      name: string;
      enable: boolean;
    }) => {
      const endpoint = enable ? "enable" : "disable";
      const res = await fetch(`/api/v1/extensions/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(`Failed to ${enable ? "enable" : "disable"} extension`);
      const result = await res.json();
      return Array.isArray(result) ? result : (result.results ?? result.data ?? result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/extensions/list"] });
    },
  });

  const installMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch("/api/v1/extensions/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error("Failed to install extension");
      const result = await res.json();
      return Array.isArray(result) ? result : (result.results ?? result.data ?? result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/extensions/list"] });
      setInstallOpen(false);
      setInstallUrl("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/v1/extensions/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to update extension");
      const result = await res.json();
      return Array.isArray(result) ? result : (result.results ?? result.data ?? result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/extensions/list"] });
    },
  });

  const updateAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/extensions/updateAll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to update all extensions");
      const result = await res.json();
      return Array.isArray(result) ? result : (result.results ?? result.data ?? result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v1/extensions/list"] });
    },
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Extensions</h2>
          <p className="text-muted-foreground">
            {extensions?.length ?? 0} extensions installed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => updateAllMutation.mutate()}
            disabled={updateAllMutation.isPending || !extensions?.length}
          >
            <RefreshCw className="h-4 w-4" />
            Update All
          </Button>
          <Button onClick={() => setInstallOpen(true)}>
            <Download className="h-4 w-4" />
            Install
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {extensions?.map((ext) => (
          <Card key={ext.name} className={ext.enabled ? "" : "opacity-60"}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                <CardTitle className="truncate text-base">
                  {ext.displayName}
                </CardTitle>
              </div>
              <ToggleSwitch
                enabled={ext.enabled}
                onToggle={() =>
                  toggleMutation.mutate({ name: ext.name, enable: !ext.enabled })
                }
              />
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {ext.description}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  v{ext.version}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {ext.author}
                </span>
                {ext.lastUpdated && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(ext.lastUpdated).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateMutation.mutate(ext.name)}
                  disabled={updateMutation.isPending}
                >
                  <RefreshCw className="h-3 w-3" />
                  Update
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {extensions?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No extensions installed.</p>
          </CardContent>
        </Card>
      )}

      {/* Install Modal */}
      <Modal open={installOpen} onClose={() => setInstallOpen(false)} title="Install Extension">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Extension URL</label>
            <Input
              value={installUrl}
              onChange={(e) => setInstallUrl(e.target.value)}
              placeholder="https://github.com/..."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Provide a Git repository URL or direct download link.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setInstallOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => installMutation.mutate(installUrl)}
              disabled={!installUrl.trim() || installMutation.isPending}
            >
              {installMutation.isPending ? "Installing..." : "Install"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ToggleSwitch({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
        enabled ? "bg-green-500" : "bg-input"
      }`}
    >
      <span className="sr-only">Toggle</span>
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform ${
          enabled ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
