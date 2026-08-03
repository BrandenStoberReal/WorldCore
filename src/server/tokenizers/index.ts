import { cachePaths } from '@/server/storage/paths';
import path from 'node:path';

export interface Tokenizer {
  encode(text: string): number[];
  decode(tokens: number[]): string;
  countTokens(text: string): number;
}

const cache = new Map<string, Tokenizer>();

export async function resolve(model: string): Promise<Tokenizer | null> {
  if (cache.has(model)) return cache.get(model) || null;

  // Only use tiktoken for GPT models - it's the only accurate tokenizer
  if (/^gpt-|text-davinci|text-embedding/i.test(model)) {
    try {
      const { TiktokenTokenizer } = await import('./tiktoken');
      const tokenizer = new TiktokenTokenizer(model);
      cache.set(model, tokenizer);
      return tokenizer;
    } catch {
      // Fall through
    }
  }

  // For all other models (Claude, Gemini, Llama, etc.), use estimateTokens fallback
  // The SentencepieceTokenizer and WebTokenizer are character counters, not tokenizers
  // estimateTokens (length/4) is more accurate than character counting
  const fallbackTokenizer: Tokenizer = {
    encode(text: string): number[] {
      // Return character codes as a rough approximation
      return text.split('').map((c) => c.charCodeAt(0));
    },
    decode(tokens: number[]): string {
      return String.fromCharCode(...tokens);
    },
    countTokens(text: string): number {
      return estimateTokens(text);
    },
  };
  cache.set(model, fallbackTokenizer);
  return fallbackTokenizer;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function clearCache(): void {
  cache.clear();
}
