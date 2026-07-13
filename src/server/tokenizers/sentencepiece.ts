import path from "node:path"
import type { Tokenizer } from "./index"

export class SentencepieceTokenizer implements Tokenizer {
  private modelPath: string

  constructor(model: string, cacheDir: string) {
    this.modelPath = path.join(cacheDir, `${model.replace(/[^a-zA-Z0-9]/g, "_")}.model`)
  }

  async load(): Promise<void> {
    // Download or load sentencepiece model
    // For now, return a simple tokenizer
  }

  encode(text: string): number[] {
    return text.split("").map((c) => c.charCodeAt(0))
  }

  decode(tokens: number[]): string {
    return tokens.map((t) => String.fromCharCode(t)).join("")
  }

  countTokens(text: string): number {
    return this.encode(text).length
  }
}
