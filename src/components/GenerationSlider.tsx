import { useCallback } from 'react';
import { cn } from '@/lib/utils';

interface GenerationSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  description?: string;
  disabled?: boolean;
}

export function GenerationSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  description,
  disabled,
}: GenerationSliderProps) {
  const handleSlider = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      onChange(parseFloat((e.target as HTMLInputElement).value));
    },
    [onChange],
  );

  const handleNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFloat(e.target.value);
      if (!Number.isNaN(parsed)) {
        onChange(Math.min(max, Math.max(min, parsed)));
      }
    },
    [onChange, min, max],
  );

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="mono-tag text-foreground/60" title={description}>
          {label}
        </label>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={step < 0.01 ? value.toFixed(3) : step < 1 ? value.toFixed(2) : value}
            onChange={handleNumberChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className={cn(
              'border-border bg-background/60 h-5 w-14 rounded-sm border px-1.5',
              'text-foreground/80 text-right font-mono text-[10px]',
              'focus:border-ember/50 focus:ring-ember/20 outline-none focus:ring-1',
              'disabled:cursor-not-allowed disabled:opacity-40',
              '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
            )}
            aria-label={`${label} value`}
          />
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={handleSlider}
        disabled={disabled}
        className={cn('gen-slider', disabled && 'cursor-not-allowed opacity-40')}
        aria-label={`${label} slider`}
      />
    </div>
  );
}
