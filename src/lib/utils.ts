import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Pre-baked UI helpers — used throughout the redesigned UI.
 * Kept here as plain string constants so they can be composed via cn() without
 * each component needing to redeclare the same chrome.
 */

/** Accent glow on an interactive element — used on primary CTA hover */
export const emberGlow =
  "transition-shadow duration-300 hover:shadow-[0_0_24px_-4px_color-mix(in_oklch,var(--ember)_60%,transparent)] focus-visible:shadow-[0_0_24px_-4px_color-mix(in_oklch,var(--ember)_60%,transparent)]";

/** Frosted-glass plate — used in header bar + sticky panels */
export const frostedGlass =
  "backdrop-blur-xl bg-background/70 border-b border-border/60 supports-[backdrop-filter]:bg-background/50";

/** Clean card surface — used on cards + tiles */
export const hammeredPlate =
  "bg-card border border-border shadow-[inset_0_1px_0_0_color-mix(in oklch,var(--foreground)_6%,transparent),inset_0_-1px_0_0_color-mix(in oklch,var(--foreground)_4%,transparent)]";

/** Subtle accent bottom edge for an element */
export const emberEdge =
  "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-ember/70 after:to-transparent after:opacity-0 hover:after:opacity-100 after:transition-opacity";
