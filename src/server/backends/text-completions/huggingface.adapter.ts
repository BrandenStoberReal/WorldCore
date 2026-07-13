import type { TextCompletionAdapter } from "./types"
import type { TextCompletionRequest } from "@/shared/types/backends/textcompletions"

export class HuggingFaceAdapter implements TextCompletionAdapter {
  source = "huggingface" as const

  async forwardRequest(req: TextCompletionRequest): Promise<Response> {
    const url =
      (req.reverse_proxy as string | undefined) || `https://api-inference.huggingface.co/models/${req.model}`

    const body: Record<string, unknown> = {
      inputs: req.prompt,
      parameters: {
        max_new_tokens: req.max_length,
        temperature: req.temperature,
        top_p: req.top_p,
        top_k: req.top_k,
        stop_sequences: req.stop,
      },
    }

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.getKey(req)}`,
      },
      body: JSON.stringify(body),
      signal: (req.signal as AbortSignal | undefined),
    })
  }

  private getKey(req: TextCompletionRequest): string {
    return (req.api_key as string | undefined) || ""
  }
}
