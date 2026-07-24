import { useNavStore } from '@/lib/navStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="border-border bg-background/40 hover:bg-accent/30 flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition-colors"
    >
      <div className="flex flex-col">
        <span className="text-[13px] font-medium">{label}</span>
        {description && (
          <span className="mono-tag text-muted-foreground/55 mt-0.5">{description}</span>
        )}
      </div>
      <span
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
          checked ? 'bg-ember' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'bg-background pointer-events-none inline-block h-4 w-4 transform rounded-full shadow ring-0 transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </span>
    </button>
  );
}

export function UISettingsPanel() {
  const alwaysShowViewportNavbar = useNavStore((s) => s.alwaysShowViewportNavbar);
  const setAlwaysShowViewportNavbar = useNavStore((s) => s.setAlwaysShowViewportNavbar);

  return (
    <div data-panel="ui-settings" className="section-rhythm relative isolate">
      <PageHeader
        tag="[UI] — SETTINGS"
        title="Interface"
        description="Customize the look and feel of the interface."
      />

      <div className="space-y-4">
        <Card className="gap-4 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
              Navigation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            <Toggle
              checked={alwaysShowViewportNavbar}
              onChange={setAlwaysShowViewportNavbar}
              label="Always show viewport navbar"
              description="Keep the bottom navigation bar visible at all times"
            />
          </CardContent>
        </Card>

        <Card className="gap-4 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
              Theme
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <p className="text-muted-foreground/55 text-[13px]">Theme settings coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
