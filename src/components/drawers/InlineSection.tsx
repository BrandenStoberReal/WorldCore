import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavStore } from '@/lib/navStore';

interface InlineSectionProps {
  panelId: string;
  sectionId: string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function InlineSection({
  panelId,
  sectionId,
  title,
  defaultOpen = false,
  children,
}: InlineSectionProps) {
  const open = useNavStore((s) => s.inlineDrawers[`${panelId}/${sectionId}`] ?? defaultOpen);
  const toggle = useNavStore((s) => s.toggleInline);

  return (
    <div className={cn('inline-drawer', open && 'inline-drawer-expanded')}>
      <button
        onClick={() => toggle(panelId, sectionId)}
        aria-expanded={open}
        className="inline-drawer-trigger hover:bg-accent/40 flex w-full items-center gap-1.5 pr-2.5 pl-2 text-left transition-colors"
      >
        <span
          className={cn(
            'text-muted-foreground/55 transition-transform duration-200',
            open && 'rotate-90',
          )}
        >
          <ChevronDown size={12} strokeWidth={2.25} />
        </span>
        <span className="text-foreground/80 text-[12px] font-medium tracking-tight">{title}</span>
      </button>
      <div className={cn('accordion-content', open && 'accordion-open')}>
        <div className="inline-drawer-body">{children}</div>
      </div>
    </div>
  );
}
