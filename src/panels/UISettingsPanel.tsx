import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import { useAppStore, type EmbeddedImageSize } from '@/lib/stores';
import { IMAGE_SIZE_CLASSES } from '@/shared/schemas/embedded-images';
import { X, Plus } from 'lucide-react';

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
      role="switch"
      aria-checked={checked}
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
  const mobileNavPosition = useAppStore((s) => s.mobileNavPosition);
  const setMobileNavPosition = useAppStore((s) => s.setMobileNavPosition);
  const renderCharacterHtml = useAppStore((s) => s.renderCharacterHtml);
  const setRenderCharacterHtml = useAppStore((s) => s.setRenderCharacterHtml);
  const allowCharacterExternalMedia = useAppStore((s) => s.allowCharacterExternalMedia);
  const setAllowCharacterExternalMedia = useAppStore((s) => s.setAllowCharacterExternalMedia);
  const embeddedImageSize = useAppStore((s) => s.embeddedImageSize);
  const setEmbeddedImageSize = useAppStore((s) => s.setEmbeddedImageSize);
  const browserBlurThumbnails = useAppStore((s) => s.browserBlurThumbnails);
  const setBrowserBlurThumbnails = useAppStore((s) => s.setBrowserBlurThumbnails);
  const browserBlockedTags = useAppStore((s) => s.browserBlockedTags);
  const setBrowserBlockedTags = useAppStore((s) => s.setBrowserBlockedTags);

  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingTag && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [addingTag]);

  const addTag = useCallback(() => {
    const trimmed = newTag.trim();
    if (!trimmed || browserBlockedTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setAddingTag(false);
      setNewTag('');
      return;
    }
    setBrowserBlockedTags([...browserBlockedTags, trimmed]);
    setNewTag('');
    setAddingTag(false);
  }, [newTag, browserBlockedTags, setBrowserBlockedTags]);

  const removeTag = useCallback(
    (tag: string) => {
      setBrowserBlockedTags(browserBlockedTags.filter((t) => t !== tag));
    },
    [browserBlockedTags, setBrowserBlockedTags],
  );

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag();
      } else if (e.key === 'Escape') {
        setAddingTag(false);
        setNewTag('');
      }
    },
    [addTag],
  );

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
          <CardContent className="px-4">
            <Toggle
              checked={mobileNavPosition === 'top'}
              onChange={(v) => setMobileNavPosition(v ? 'top' : 'bottom')}
              label="Mobile nav at top"
              description="Position the mobile navigation bar at the top instead of the bottom"
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

        <Card className="gap-4 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
              Character Content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4">
            <Toggle
              checked={renderCharacterHtml}
              onChange={setRenderCharacterHtml}
              label="Render HTML in character cards"
              description="Allow character cards to display formatted HTML content (bold, italic, links, etc.)"
            />
            <Toggle
              checked={allowCharacterExternalMedia}
              onChange={setAllowCharacterExternalMedia}
              label="Allow external media"
              description="Allow character cards to load images from external URLs (may have privacy implications)"
            />
            {allowCharacterExternalMedia && (
              <div className="space-y-2">
                <label className="text-[13px] font-medium">Embedded image size</label>
                <div className="flex gap-2">
                  {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setEmbeddedImageSize(size)}
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-[13px] transition-colors',
                        embeddedImageSize === size
                          ? 'border-ember bg-ember/10 text-ember'
                          : 'border-border bg-background/40 hover:bg-accent/30 text-muted-foreground',
                      )}
                    >
                      {size === 'small' ? 'Small' : size === 'medium' ? 'Medium' : size === 'large' ? 'Large' : 'Extra Large'}
                    </button>
                  ))}
                </div>
                <p className="text-muted-foreground/55 text-[12px]">
                  Default: Small (20em). Larger sizes may affect chat layout.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="gap-4 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-muted-foreground/60 text-sm font-semibold tracking-wider uppercase">
              Character Browser
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4">
            <Toggle
              checked={browserBlurThumbnails}
              onChange={setBrowserBlurThumbnails}
              label="Blur thumbnails"
              description="Blur character thumbnails in the browser until hovered"
            />
            <div className="space-y-2">
              <label className="text-[13px] font-medium">Tag blacklist</label>
              <p className="text-muted-foreground/55 text-[12px]">
                Hide characters with these tags from the browser. Extensions can also use this list
                for filtering.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {browserBlockedTags.map((tag) => (
                  <span
                    key={tag}
                    className="group/tag inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/50 px-2 py-1 text-sm"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      title={`Remove tag: ${tag}`}
                      aria-label={`Remove tag ${tag}`}
                      className="text-muted-foreground/50 rounded transition-colors hover:text-destructive opacity-0 group-hover/tag:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}

                {addingTag ? (
                  <span className="inline-flex items-center rounded-md border border-border/60 bg-muted/50 px-2 py-1">
                    <input
                      ref={tagInputRef}
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      onBlur={addTag}
                      placeholder="type a tag…"
                      className="w-24 bg-transparent text-sm outline-none"
                    />
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingTag(true)}
                    title="Add blocked tag"
                    aria-label="Add blocked tag"
                    className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-sm text-muted-foreground transition-colors hover:border-ember/40 hover:text-ember"
                  >
                    <Plus className="h-3 w-3" />
                    Add tag
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default UISettingsPanel;
