import type { PresetCategory } from '@/shared/types/preset';

export const SEED_KOBOLD_PRESETS: { category: PresetCategory; data: Record<string, unknown> }[] = [
  {
    category: 'kobold',
    data: {
      name: 'Default',
    },
  },
  {
    category: 'kobold',
    data: {
      name: 'Creative',
      temp: 1.2,
      top_p: 0.95,
      tfs: 0.95,
      rep_pen: 1.1,
    },
  },
  {
    category: 'kobold',
    data: {
      name: 'Precise',
      temp: 0.5,
      top_p: 0.9,
      rep_pen: 1.05,
    },
  },
  {
    category: 'kobold',
    data: {
      name: 'Adventure',
      temp: 0.8,
      top_p: 0.95,
      rep_pen: 1.1,
    },
  },
  {
    category: 'kobold',
    data: {
      name: 'Writing',
      temp: 0.9,
      top_p: 0.95,
      rep_pen: 1.1,
    },
  },
  {
    category: 'kobold',
    data: {
      name: 'Chat',
      temp: 0.85,
      top_p: 0.95,
      rep_pen: 1.05,
    },
  },
];
