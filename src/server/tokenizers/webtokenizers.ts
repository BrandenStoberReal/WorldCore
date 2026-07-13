import path from "node:path"
import type { Tokenizer } from "./index"

export class WebTokenizer implements Tokenizer {
  private _cacheDir: string

  constructor(model: string, cacheDir: string) {
    this._cacheDir = path.join(cacheDir, model.replace(/[^a-zA-Z0-9]/g, "_"))
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
