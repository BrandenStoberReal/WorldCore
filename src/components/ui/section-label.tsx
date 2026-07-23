import { cn } from '@/lib/utils';

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <span className={cn('mono-tag text-foreground/35 mb-1 block text-[10px]', className)}>
      {children}
    </span>
  );
}
