import type { PresetCategory } from '@/shared/types/preset';

export const SEED_OPENAI_PRESETS: { category: PresetCategory; data: Record<string, unknown> }[] = [
  {
    category: 'openai',
    data: {
      name: 'Default',
      stream_openai: true,
    },
  },
  {
    category: 'openai',
    data: {
      name: 'Creative',
      temperature: 1.3,
      max_tokens: 300,
      top_p: 0.9,
      frequency_penalty: 0.3,
      presence_penalty: 0.3,
    },
  },
  {
    category: 'openai',
    data: {
      name: 'Precise',
      temperature: 0.3,
      top_p: 0.9,
    },
  },
  {
    category: 'openai',
    data: {
      name: 'Balance',
      temperature: 0.8,
      max_tokens: 250,
      top_p: 0.95,
      frequency_penalty: 0.1,
      presence_penalty: 0.1,
    },
  },
  {
    category: 'openai',
    data: {
      name: 'OpenAI-Turbo',
      temperature: 0.7,
    },
  },
  {
    category: 'openai',
    data: {
      name: 'OpenAI-GPT4',
      temperature: 0.7,
    },
  },
  {
    category: 'openai',
    data: {
      name: 'Claude-V2',
      temperature: 0.8,
    },
  },
  {
    category: 'openai',
    data: {
      name: 'Claude-Instant',
      temperature: 0.7,
    },
  },
  {
    category: 'openai',
    data: {
      name: 'Google-PaLM',
      temperature: 0.2,
      top_p: 0.95,
    },
  },
  {
    category: 'openai',
    data: {
      name: 'Google-Gemini',
      temperature: 0.2,
      top_p: 0.95,
    },
  },
  {
    category: 'openai',
    data: {
      name: 'Groq-Mixtral',
      temperature: 0.7,
      top_p: 0.9,
    },
  },
  {
    category: 'openai',
    data: {
      name: 'Groq-Llama',
      temperature: 0.7,
      top_p: 0.9,
    },
  },
  {
    category: 'openai',
    data: {
      name: 'Mistral-Turbo',
      temperature: 0.7,
      top_p: 0.9,
    },
  },
  {
    category: 'openai',
    data: {
      name: 'Text-Completion',
      temperature: 0.7,
    },
  },
];
