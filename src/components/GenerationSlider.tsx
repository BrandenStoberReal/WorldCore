import { useCallback } from "react";
import { cn } from "@/lib/utils";

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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="mono-tag text-foreground/60">{label}</label>
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
              "w-16 h-6 rounded-sm border border-border bg-background/60 px-1.5",
              "text-right text-[11px] font-mono text-foreground/80",
              "focus:border-ember/50 focus:ring-1 focus:ring-ember/20 outline-none",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            )}
            aria-label={`${label} value`}
          />
        </div>
      </div>
      {description && (
        <p className="text-[10px] leading-tight text-foreground/35 -mt-0.5">{description}</p>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={handleSlider}
        disabled={disabled}
        className={cn("gen-slider", disabled && "opacity-40 cursor-not-allowed")}
        aria-label={`${label} slider`}
      />
    </div>
  );
}
