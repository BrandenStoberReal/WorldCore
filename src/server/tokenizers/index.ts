import { cachePaths } from "@/server/storage/paths"
import path from "node:path"

export interface Tokenizer {
  encode(text: string): number[]
  decode(tokens: number[]): string
  countTokens(text: string): number
}

const cache = new Map<string, Tokenizer>()

export async function resolve(model: string): Promise<Tokenizer | null> {
  if (cache.has(model)) return cache.get(model) || null

  if (/^gpt-|text-davinci|text-embedding/i.test(model)) {
    try {
      const { TiktokenTokenizer } = await import("./tiktoken")
      const tokenizer = new TiktokenTokenizer(model)
      cache.set(model, tokenizer)
      return tokenizer
    } catch {
      // Fall through
    }
  }

  if (/^claude|gemini|mistral|llama/i.test(model)) {
    try {
      const { SentencepieceTokenizer } = await import("./sentencepiece")
      const tokenizer = new SentencepieceTokenizer(model, cachePaths.tokenizers)
      cache.set(model, tokenizer)
      return tokenizer
    } catch {
      // Fall through
    }
  }

  try {
    const { WebTokenizer } = await import("./webtokenizers")
    const tokenizer = new WebTokenizer(model, cachePaths.tokenizers)
    cache.set(model, tokenizer)
    return tokenizer
  } catch {
    // Fall through
  }

  return null
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function clearCache(): void {
  cache.clear()
}
