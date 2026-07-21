import type { PresetCategory } from '@/shared/types/preset';

export const SEED_TEXTGEN_PRESETS: { category: PresetCategory; data: Record<string, unknown> }[] = [
  {
    category: 'textgenerationwebui',
    data: {
      name: 'Default',
      top_p: 0.95,
      rep_pen: 1.1,
      min_p: 0.01,
      tfs: 1,
    },
  },
  {
    category: 'textgenerationwebui',
    data: {
      name: 'Deterministic',
      temp: 0,
      top_p: 0,
      min_p: 0,
      tfs: 1,
      do_sample: false,
    },
  },
  {
    category: 'textgenerationwebui',
    data: {
      name: 'Neutral',
      min_p: 0,
      tfs: 1,
    },
  },
  {
    category: 'textgenerationwebui',
    data: {
      name: 'Universal-Light',
      temp: 1.25,
      min_p: 0.1,
      tfs: 1,
    },
  },
  {
    category: 'textgenerationwebui',
    data: {
      name: 'Universal-Creative',
      temp: 1.5,
      min_p: 0.1,
      tfs: 1,
    },
  },
  {
    category: 'textgenerationwebui',
    data: {
      name: 'Universal-Super-Creative',
      temp: 2,
      min_p: 0.1,
      tfs: 1,
    },
  },
];
