import type { PresetCategory } from '@/shared/types/preset';

export const SEED_NOVEL_PRESETS: { category: PresetCategory; data: Record<string, unknown> }[] = [
  {
    category: 'novel',
    data: {
      name: 'Default',
    },
  },
  {
    category: 'novel',
    data: {
      name: 'Creative',
      temperature: 1.1,
      max_length: 300,
      top_a: 0.1,
      top_k: 10,
    },
  },
  {
    category: 'novel',
    data: {
      name: 'Precise',
      temperature: 0.5,
    },
  },
  {
    category: 'novel',
    data: {
      name: 'Vibe-Mythic',
      top_a: 0.05,
    },
  },
  {
    category: 'novel',
    data: {
      name: 'Vibe-Cohesive',
      temperature: 0.9,
      top_a: 0.02,
    },
  },
  {
    category: 'novel',
    data: {
      name: 'Vibe-Inspired',
      temperature: 1.05,
      max_length: 250,
      top_a: 0.03,
    },
  },
  {
    category: 'novel',
    data: {
      name: 'Vibe-Descriptive',
      temperature: 0.95,
      top_a: 0.01,
    },
  },
  {
    category: 'novel',
    data: {
      name: 'Vibe-Narrative',
      top_a: 0.02,
    },
  },
  {
    category: 'novel',
    data: {
      name: 'Vibe-Adventurous',
      temperature: 1.1,
      max_length: 250,
      top_a: 0.05,
    },
  },
  {
    category: 'novel',
    data: {
      name: 'Vibe-Horror',
      temperature: 0.85,
      top_a: 0.01,
    },
  },
  {
    category: 'novel',
    data: {
      name: 'Vibe-Romance',
      temperature: 0.95,
      top_a: 0.02,
    },
  },
  {
    category: 'novel',
    data: {
      name: 'Vibe-Comedy',
      temperature: 1.15,
      top_a: 0.03,
    },
  },
  {
    category: 'novel',
    data: {
      name: 'Vibe-Action',
      temperature: 1.05,
      max_length: 250,
      top_a: 0.04,
    },
  },
];
