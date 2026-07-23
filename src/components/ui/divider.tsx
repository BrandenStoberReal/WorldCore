import { cn } from '@/lib/utils';

interface DividerProps {
  width?: 'sm' | 'md' | 'lg';
  className?: string;
}

const widthMap = {
  sm: 'w-4',
  md: 'w-8',
  lg: 'w-12',
};

export function Divider({ width = 'md', className }: DividerProps) {
  return <span className={cn('bg-ember/40 h-px', widthMap[width], className)} />;
}
